import fs from 'fs';
import path from 'path';
import { PaymentStatus, Registration } from './types';

// Detect Vercel environment or fallback to /tmp if process.cwd() is read-only
function getDataPaths() {
  const localDir = path.join(process.cwd(), 'data');
  const localFile = path.join(localDir, 'tos2026-registrations.json');

  // If we are in Vercel/production or local dir is not writable/creatable, use /tmp
  const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  if (isVercel) {
    const tmpDir = '/tmp';
    return {
      dir: tmpDir,
      file: path.join(tmpDir, 'tos2026-registrations.json')
    };
  }

  return { dir: localDir, file: localFile };
}

const { dir: DATA_DIR, file: DATA_FILE } = getDataPaths();

export function ensureRegistrationDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    }
  } catch (error) {
    console.error('Failed to ensure local registration data file:', error);
  }
}

export function getLocalRegistrations(): Registration[] {
  try {
    ensureRegistrationDataFile();
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read registrations from file:', error);
    return [];
  }
}

export function saveLocalRegistration(registration: Registration) {
  try {
    const existing = getLocalRegistrations();
    existing.push(registration);
    fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save local registration:', error);
  }
}

export function getLocalRegistration(registrationId: string) {
  try {
    const existing = getLocalRegistrations();
    return existing.find((registration) => registration.registrationId === registrationId) || null;
  } catch (error) {
    console.error('Failed to get local registration:', error);
    return null;
  }
}

export function updateLocalRegistrationPayment(
  registrationId: string,
  payment: {
    status: PaymentStatus;
    paymentReference?: string;
    flutterwaveTransactionId?: string;
    paidAt?: string;
  }
) {
  try {
    const existing = getLocalRegistrations();
    let updated = false;

    const next = existing.map((registration) => {
      if (registration.registrationId !== registrationId) {
        return registration;
      }

      updated = true;
      return {
        ...registration,
        paymentStatus: payment.status,
        paymentReference: payment.paymentReference || registration.paymentReference,
        flutterwaveTransactionId: payment.flutterwaveTransactionId || registration.flutterwaveTransactionId,
        paidAt: payment.paidAt || registration.paidAt,
      };
    });

    if (updated) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), 'utf-8');
    }

    return updated;
  } catch (error) {
    console.error('Failed to update local registration payment:', error);
    return false;
  }
}
