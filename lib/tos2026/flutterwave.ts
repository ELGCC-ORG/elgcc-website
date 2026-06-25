import { Registration } from './types';

const FLUTTERWAVE_API_BASE = 'https://api.flutterwave.com/v3';
export const TOS_PAYMENT_SOURCE = 'elgcc_tos2026';

interface FlutterwavePaymentResponse {
  status: string;
  message: string;
  data?: {
    link?: string;
  };
}

export interface FlutterwaveTransaction {
  id?: number;
  tx_ref?: string;
  flw_ref?: string;
  status?: string;
  amount?: number;
  charged_amount?: number;
  currency?: string;
  customer?: {
    email?: string;
    name?: string;
    phone_number?: string;
  };
  meta?: Record<string, unknown>;
}

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data?: FlutterwaveTransaction;
}

export function isFlutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY !== 'PLACEHOLDER');
}

export function getSiteUrl(origin?: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || origin || 'https://eternallifegcc.com').replace(/\/$/, '');
}

export function getFlutterwaveCurrency() {
  return process.env.FLUTTERWAVE_CURRENCY || 'NGN';
}

export function getFlutterwaveTxRef(registrationId: string) {
  return registrationId.startsWith('TOS26-') ? registrationId : `TOS26-${registrationId}`;
}

function getAuthHeaders() {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Flutterwave secret key is not configured.');
  }

  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

export async function createFlutterwavePaymentLink(registration: Registration, origin?: string) {
  const siteUrl = getSiteUrl(origin);
  const txRef = getFlutterwaveTxRef(registration.registrationId);

  const response = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      tx_ref: txRef,
      amount: registration.totalAmount,
      currency: getFlutterwaveCurrency(),
      redirect_url: `${siteUrl}/api/tos2026/flutterwave/callback`,
      customer: {
        email: registration.coordinator.emailAddress,
        phonenumber: registration.coordinator.phoneNumber,
        name: registration.coordinator.fullName,
      },
      customizations: {
        title: process.env.FLUTTERWAVE_TITLE || 'ELGCC Training of the Spirit 2026',
        description: process.env.FLUTTERWAVE_DESCRIPTION || 'TOS 2026 Registration Payment',
        logo: process.env.FLUTTERWAVE_LOGO_URL || `${siteUrl}/images/elgcc-logo.png`,
      },
      meta: {
        source: TOS_PAYMENT_SOURCE,
        registrationId: registration.registrationId,
        registrationType: registration.registrationType || 'individual',
        attendeeCount: registration.attendees.length,
        coordinatorChurch: registration.coordinator.churchName,
      },
    }),
  });

  const body = (await response.json()) as FlutterwavePaymentResponse;

  if (!response.ok || body.status !== 'success' || !body.data?.link) {
    throw new Error(body.message || 'Unable to create Flutterwave payment link.');
  }

  return {
    paymentLink: body.data.link,
    txRef,
  };
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  const response = await fetch(`${FLUTTERWAVE_API_BASE}/transactions/${transactionId}/verify`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const body = (await response.json()) as FlutterwaveVerifyResponse;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Unable to verify Flutterwave transaction.');
  }

  return body.data;
}

export async function verifyFlutterwaveTransactionByRef(txRef: string) {
  const response = await fetch(`${FLUTTERWAVE_API_BASE}/transactions/verify_by_reference?tx_ref=${txRef}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const body = (await response.json()) as FlutterwaveVerifyResponse;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Unable to verify Flutterwave transaction by reference.');
  }

  return body.data;
}


export function getRegistrationIdFromTransaction(transaction: FlutterwaveTransaction) {
  const metaRegistrationId = transaction.meta?.registrationId;
  if (typeof metaRegistrationId === 'string' && metaRegistrationId.startsWith('TOS26-')) {
    return metaRegistrationId;
  }

  if (transaction.tx_ref?.startsWith('TOS26-')) {
    return transaction.tx_ref;
  }

  return '';
}

export function isSuccessfulFlutterwaveTransaction(transaction: FlutterwaveTransaction) {
  const status = String(transaction.status || '').toLowerCase();
  return status === 'successful' || status === 'succeeded';
}

export function isTosFlutterwaveTransaction(transaction: FlutterwaveTransaction) {
  return (
    transaction.tx_ref?.startsWith('TOS26-') ||
    transaction.meta?.source === TOS_PAYMENT_SOURCE ||
    Boolean(getRegistrationIdFromTransaction(transaction))
  );
}

export function assertFlutterwavePaymentMatchesRegistration(transaction: FlutterwaveTransaction, registration: Registration) {
  const registrationId = getRegistrationIdFromTransaction(transaction);

  if (!isTosFlutterwaveTransaction(transaction) || registrationId !== registration.registrationId) {
    throw new Error('Flutterwave transaction does not belong to this TOS registration.');
  }

  if (!isSuccessfulFlutterwaveTransaction(transaction)) {
    throw new Error('Flutterwave transaction is not successful.');
  }

  if (transaction.currency !== getFlutterwaveCurrency()) {
    throw new Error('Flutterwave transaction currency does not match this registration.');
  }

  if (Number(transaction.amount) !== registration.totalAmount) {
    throw new Error('Flutterwave transaction amount does not match this registration.');
  }
}

export function getTransactionIdFromWebhookPayload(payload: unknown) {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  const id = data?.id || data?.transaction_id || data?.tx_id;
  return id ? String(id) : '';
}
