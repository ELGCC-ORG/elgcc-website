import {
  assertFlutterwavePaymentMatchesRegistration,
  FlutterwaveTransaction,
  getRegistrationIdFromTransaction,
} from './flutterwave';
import { sendConfirmationEmail } from './email';
import { getLocalRegistration, updateLocalRegistrationPayment } from './registrations';
import {
  getRegistrationFromGoogleSheet,
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

  return getRegistrationFromGoogleSheet(registrationId);
}

export async function markFlutterwaveRegistrationPaid(transaction: FlutterwaveTransaction) {
  const registrationId = getRegistrationIdFromTransaction(transaction);

  if (!registrationId) {
    throw new Error('Flutterwave transaction is missing a TOS registration reference.');
  }

  const registration = await findRegistrationForPayment(registrationId);

  if (!registration) {
    throw new Error(`No TOS registration found for ${registrationId}.`);
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

  await updateGoogleSheetPaymentStatus(registration.registrationId, {
    paymentStatus: 'paid',
    paymentReference,
    flutterwaveTransactionId,
    paidAt,
    paymentProvider: 'flutterwave',
  });

  const paidRegistration: Registration = {
    ...registration,
    paymentStatus: 'paid',
    paymentReference,
    flutterwaveTransactionId,
    paidAt,
    paymentProvider: 'flutterwave',
  };

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

  await updateGoogleSheetPaymentStatus(registration.registrationId, {
    paymentStatus: 'paid',
    paymentReference: reference,
    flutterwaveTransactionId: '',
    paidAt,
    paymentProvider: 'manual',
  });

  const paidRegistration: Registration = {
    ...registration,
    paymentStatus: 'paid',
    paymentReference: reference,
    paidAt,
    paymentProvider: 'manual',
  };

  if (!wasAlreadyPaid) {
    await sendConfirmationEmail(paidRegistration);
  }

  return paidRegistration;
}

