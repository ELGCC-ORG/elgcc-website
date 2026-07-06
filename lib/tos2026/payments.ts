import {
  assertFlutterwavePaymentMatchesRegistration,
  FlutterwaveTransaction,
  getRegistrationIdFromTransaction,
} from './flutterwave';
import { sendConfirmationEmail } from './email';
import { getLocalRegistration, updateLocalRegistrationPayment } from './registrations';
import {
  appendToGoogleSheet,
  deleteFromPendingGoogleSheet,
  getRegistrationFromGoogleSheet,
  getRegistrationFromPendingGoogleSheet,
  updateGoogleSheetPaymentStatus,
} from './sheets';
import { Registration } from './types';

export async function findRegistrationForPayment(registrationId: string) {
  try {
    const localRegistration = getLocalRegistration(registrationId);
    if (localRegistration) {
      return localRegistration;
    }
  } catch (error) {
    console.log('Local registration lookup unavailable:', error);
  }

  // Check pending sheet first, because most payments are for pending registrations
  const pendingReg = await getRegistrationFromPendingGoogleSheet(registrationId);
  if (pendingReg) {
    return pendingReg;
  }

  return getRegistrationFromGoogleSheet(registrationId);
}

export async function markFlutterwaveRegistrationPaid(transaction: FlutterwaveTransaction) {
  const registrationId = getRegistrationIdFromTransaction(transaction);

  if (!registrationId) {
    throw new Error('Flutterwave transaction is missing a TOS registration reference.');
  }

  let registration = await findRegistrationForPayment(registrationId);

  if (!registration) {
    // Reconstruct registration details from Flutterwave transaction metadata and customer fields
    const attendeeCount = Number(transaction.meta?.attendeeCount || 1);
    const coordinatorName = String(transaction.customer?.name || transaction.meta?.originatorname || 'Unknown');
    const coordinatorPhone = String(transaction.customer?.phone_number || '');
    const coordinatorEmail = String(transaction.customer?.email || '');
    const coordinatorChurch = String(transaction.meta?.coordinatorChurch || '');

    const attendees: import('./types').Attendee[] = [{
      id: `${registrationId}-0`,
      fullName: coordinatorName,
      gender: '',
      category: 'working_class', // Safe fallback category
      phoneNumber: coordinatorPhone,
      emailAddress: coordinatorEmail,
      region: 'Southern Nigeria',
      localChurch: coordinatorChurch,
      medicalConditions: 'None',
    }];

    for (let i = 1; i < attendeeCount; i++) {
      attendees.push({
        id: `${registrationId}-${i}`,
        fullName: `Attendee ${i + 1} (Please update manually)`,
        gender: '',
        category: 'working_class',
        phoneNumber: '',
        emailAddress: '',
        region: 'Southern Nigeria',
        localChurch: '',
        medicalConditions: 'None',
      });
    }

    registration = {
      registrationId,
      registrationType: (transaction.meta?.registrationType as any) || (attendeeCount > 1 ? 'group' : 'individual'),
      coordinator: {
        fullName: coordinatorName,
        phoneNumber: coordinatorPhone,
        emailAddress: coordinatorEmail,
        churchName: coordinatorChurch,
      },
      attendees,
      totalAmount: Number(transaction.amount || 0),
      paymentStatus: 'paid',
      paymentReference: transaction.tx_ref || registrationId,
      registeredAt: typeof transaction.created_at === 'string' ? transaction.created_at : new Date().toISOString(),
    };
  }

  assertFlutterwavePaymentMatchesRegistration(transaction, registration);

  const wasAlreadyPaid = registration.paymentStatus === 'paid';
  const paidAt = new Date().toISOString();
  const paymentReference = transaction.tx_ref || registration.registrationId;
  const flutterwaveTransactionId = transaction.id ? String(transaction.id) : '';

  try {
    updateLocalRegistrationPayment(registration.registrationId, {
      status: 'paid',
      paymentReference,
      flutterwaveTransactionId,
      paidAt,
    });
  } catch (error) {
    console.log('Local payment update unavailable:', error);
  }

  const paidRegistration: Registration = {
    ...registration,
    paymentStatus: 'paid',
    paymentReference,
    flutterwaveTransactionId,
    paidAt,
    paymentProvider: 'flutterwave',
  };

  const updatedInSheets = await updateGoogleSheetPaymentStatus(registration.registrationId, {
    paymentStatus: 'paid',
    paymentReference,
    flutterwaveTransactionId,
    paidAt,
    paymentProvider: 'flutterwave',
  });

  if (!updatedInSheets) {
    await appendToGoogleSheet(paidRegistration);
  }

  // Delete from pending sheet since it is now in the main sheet
  await deleteFromPendingGoogleSheet(registration.registrationId);

  if (!wasAlreadyPaid) {
    await sendConfirmationEmail(paidRegistration);
  }

  return paidRegistration;
}

export async function markVerifiedFlutterwavePaymentWithoutRegistration(transaction: FlutterwaveTransaction) {
  const registrationId = getRegistrationIdFromTransaction(transaction);

  if (!registrationId) {
    throw new Error('Flutterwave transaction is missing a TOS registration reference.');
  }

  return {
    registrationId,
    paymentReference: transaction.tx_ref || registrationId,
    flutterwaveTransactionId: transaction.id ? String(transaction.id) : '',
    paidAt: new Date().toISOString(),
  };
}

export async function markFlutterwaveRegistrationFailed(transaction: FlutterwaveTransaction) {
  const registrationId = getRegistrationIdFromTransaction(transaction);

  if (!registrationId) {
    return null;
  }

  const paidAt = '';
  const paymentReference = transaction.tx_ref || registrationId;
  const flutterwaveTransactionId = transaction.id ? String(transaction.id) : '';

  try {
    updateLocalRegistrationPayment(registrationId, {
      status: 'failed',
      paymentReference,
      flutterwaveTransactionId,
      paidAt,
    });
  } catch (error) {
    console.log('Local failed payment update unavailable:', error);
  }

  await updateGoogleSheetPaymentStatus(registrationId, {
    paymentStatus: 'failed',
    paymentReference,
    flutterwaveTransactionId,
    paidAt,
    paymentProvider: 'flutterwave',
  });

  return registrationId;
}

export async function markRegistrationPaidManually(registrationId: string, reference: string = 'MANUAL') {
  const registration = await findRegistrationForPayment(registrationId);

  if (!registration) {
    throw new Error(`No TOS registration found for ${registrationId}.`);
  }

  const wasAlreadyPaid = registration.paymentStatus === 'paid';
  const paidAt = new Date().toISOString();

  try {
    updateLocalRegistrationPayment(registration.registrationId, {
      status: 'paid',
      paymentReference: reference,
      paidAt,
    });
  } catch (error) {
    console.log('Local payment update unavailable:', error);
  }

  const paidRegistration: Registration = {
    ...registration,
    paymentStatus: 'paid',
    paymentReference: reference,
    paidAt,
    paymentProvider: 'manual',
  };

  const updatedInSheets = await updateGoogleSheetPaymentStatus(registration.registrationId, {
    paymentStatus: 'paid',
    paymentReference: reference,
    flutterwaveTransactionId: '',
    paidAt,
    paymentProvider: 'manual',
  });

  if (!updatedInSheets) {
    await appendToGoogleSheet(paidRegistration);
  }

  // Delete from pending sheet since it is now in the main sheet
  await deleteFromPendingGoogleSheet(registration.registrationId);

  if (!wasAlreadyPaid) {
    await sendConfirmationEmail(paidRegistration);
  }

  return paidRegistration;
}

