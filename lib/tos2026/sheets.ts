import { Registration } from './types';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const REGISTRATION_HEADERS = [
  'Registration ID',
  'Registration Type',
  'Date',
  'Payment Status',
  'Payment Reference',
  'Flutterwave Transaction ID',
  'Paid At',
  'Payment Provider',
  'Total Amount',
  'Coordinator Name',
  'Coordinator Phone',
  'Coordinator Email',
  'Coordinator Church',
  'Attendee Name',
  'Attendee Gender',
  'Attendee Category',
  'Attendee Phone',
  'Attendee Email',
  'Attendee Region',
  'Attendee Local Church',
  'Medical Conditions',
];

type RegistrationSheetRow = Record<string, string | number>;

function getGoogleSheetCredentials() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return null;
  }

  return { spreadsheetId, clientEmail, privateKey };
}

async function getSheetByTitle(title: string) {
  const credentials = getGoogleSheetCredentials();

  if (!credentials) {
    return null;
  }

  const serviceAccountAuth = new JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(credentials.spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[title];

  if (!sheet) {
    sheet = await doc.addSheet({
      title: title,
      headerValues: REGISTRATION_HEADERS,
    });
    return sheet;
  }

  await sheet.loadHeaderRow();
  const missingHeaders = REGISTRATION_HEADERS.filter((header) => !sheet.headerValues.includes(header));

  if (missingHeaders.length > 0) {
    await sheet.setHeaderRow([...sheet.headerValues, ...missingHeaders]);
  }

  return sheet;
}

export async function getRegistrationsSheet() {
  return getSheetByTitle('Registrations');
}

export async function getPendingRegistrationsSheet() {
  return getSheetByTitle('Pending Registrations');
}

export async function getGoogleSheetsDiagnostics() {
  const credentials = getGoogleSheetCredentials();

  if (!credentials) {
    return {
      configured: false,
      connected: false,
      registrationsSheetFound: false,
      error: 'Google Sheets credentials are missing.',
    };
  }

  try {
    const sheet = await getRegistrationsSheet();
    const rows = sheet ? await sheet.getRows<RegistrationSheetRow>() : [];

    return {
      configured: true,
      connected: Boolean(sheet),
      registrationsSheetFound: Boolean(sheet),
      spreadsheetIdPreview: credentials.spreadsheetId
        ? `${credentials.spreadsheetId.slice(0, 6)}...${credentials.spreadsheetId.slice(-4)}`
        : '',
      sheetTitle: sheet?.title || '',
      rowCount: rows.length,
      headers: sheet?.headerValues || [],
      error: '',
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      registrationsSheetFound: false,
      error: error instanceof Error ? error.message : 'Unable to connect to Google Sheets.',
    };
  }
}

export async function appendToGoogleSheet(registration: Registration) {
  try {
    const sheet = await getRegistrationsSheet();

    if (!sheet) {
      console.warn('Google Sheets credentials missing. Skipping sheet sync.');
      return;
    }

    // Flatten registration -> one row per attendee
    const rows = registration.attendees.map(att => ({
      'Registration ID': registration.registrationId,
      'Registration Type': registration.registrationType === 'group' ? 'Group / Church' : 'Individual',
      'Date': new Date(registration.registeredAt).toLocaleString(),
      'Payment Status': registration.paymentStatus,
      'Payment Reference': registration.paymentReference,
      'Flutterwave Transaction ID': registration.flutterwaveTransactionId || '',
      'Paid At': registration.paidAt || '',
      'Payment Provider': registration.paymentProvider || '',
      'Total Amount': registration.totalAmount,
      'Coordinator Name': registration.coordinator.fullName,
      'Coordinator Phone': registration.coordinator.phoneNumber,
      'Coordinator Email': registration.coordinator.emailAddress,
      'Coordinator Church': registration.coordinator.churchName,
      'Attendee Name': att.fullName,
      'Attendee Gender': att.gender,
      'Attendee Category': att.category.replace('_', ' '),
      'Attendee Phone': att.phoneNumber,
      'Attendee Email': att.emailAddress,
      'Attendee Region': att.region,
      'Attendee Local Church': att.localChurch,
      'Medical Conditions': att.medicalConditions || 'None',
    }));

    await sheet.addRows(rows);
    console.log(`Successfully synced registration ${registration.registrationId} to Google Sheets.`);
  } catch (error) {
    console.error('Failed to append to Google Sheets:', error);
    // Don't throw to prevent breaking the registration flow
  }
}

export async function updateGoogleSheetPaymentStatus(
  registrationId: string,
  payment: {
    paymentStatus: string;
    paymentReference: string;
    flutterwaveTransactionId: string;
    paidAt: string;
    paymentProvider: string;
  }
) {
  try {
    const sheet = await getRegistrationsSheet();

    if (!sheet) {
      console.warn('Google Sheets credentials missing. Skipping payment status update.');
      return false;
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const matchingRows = rows.filter((row) => row.get('Registration ID') === registrationId);

    if (matchingRows.length > 0) {
      for (const row of matchingRows) {
        row.set('Payment Status', payment.paymentStatus);
        row.set('Payment Reference', payment.paymentReference);
        row.set('Flutterwave Transaction ID', payment.flutterwaveTransactionId);
        row.set('Paid At', payment.paidAt);
        row.set('Payment Provider', payment.paymentProvider);
        await row.save();
      }
      return true;
    }

    // Try the pending sheet if not found in the main sheet
    const pendingSheet = await getPendingRegistrationsSheet();
    if (pendingSheet) {
      const pendingRows = await pendingSheet.getRows<RegistrationSheetRow>();
      const matchingPendingRows = pendingRows.filter((row) => row.get('Registration ID') === registrationId);

      if (matchingPendingRows.length > 0) {
        // If the payment status is updated to paid, we return false
        // so that the caller can append the full record to the main sheet
        if (payment.paymentStatus === 'paid') {
          return false;
        }

        for (const row of matchingPendingRows) {
          row.set('Payment Status', payment.paymentStatus);
          row.set('Payment Reference', payment.paymentReference);
          row.set('Flutterwave Transaction ID', payment.flutterwaveTransactionId);
          row.set('Paid At', payment.paidAt);
          row.set('Payment Provider', payment.paymentProvider);
          await row.save();
        }
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to update Google Sheets payment status:', error);
    return false;
  }
}

export async function getRegistrationFromGoogleSheet(registrationId: string): Promise<Registration | null> {
  try {
    const sheet = await getRegistrationsSheet();

    if (!sheet) {
      return null;
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const matchingRows = rows.filter((row) => row.get('Registration ID') === registrationId);

    if (matchingRows.length === 0) {
      return null;
    }

    const first = matchingRows[0];

    return {
      registrationId,
      registrationType: String(first.get('Registration Type') || '').toLowerCase().startsWith('group') ? 'group' : 'individual',
      coordinator: {
        fullName: String(first.get('Coordinator Name') || ''),
        phoneNumber: String(first.get('Coordinator Phone') || ''),
        emailAddress: String(first.get('Coordinator Email') || ''),
        churchName: String(first.get('Coordinator Church') || ''),
      },
      attendees: matchingRows.map((row, index) => ({
        id: `${registrationId}-${index}`,
        fullName: String(row.get('Attendee Name') || ''),
        gender: row.get('Attendee Gender') === 'Female' ? 'Female' : 'Male',
        category: String(row.get('Attendee Category') || '').replace(' ', '_') as Registration['attendees'][number]['category'],
        phoneNumber: String(row.get('Attendee Phone') || ''),
        emailAddress: String(row.get('Attendee Email') || ''),
        region: row.get('Attendee Region') as Registration['attendees'][number]['region'],
        localChurch: String(row.get('Attendee Local Church') || ''),
        medicalConditions: String(row.get('Medical Conditions') || ''),
      })),
      totalAmount: Number(first.get('Total Amount') || 0),
      paymentStatus: first.get('Payment Status') as Registration['paymentStatus'],
      paymentReference: String(first.get('Payment Reference') || registrationId),
      flutterwaveTransactionId: String(first.get('Flutterwave Transaction ID') || ''),
      paymentProvider: first.get('Payment Provider') === 'flutterwave' ? 'flutterwave' : undefined,
      registeredAt: new Date(String(first.get('Date') || Date.now())).toISOString(),
      paidAt: String(first.get('Paid At') || '') || undefined,
    };
  } catch (error) {
    console.error('Failed to read registration from Google Sheets:', error);
    return null;
  }
}

export async function getAllRegistrationsFromGoogleSheet(): Promise<Registration[]> {
  try {
    const sheet = await getRegistrationsSheet();

    if (!sheet) {
      return [];
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const registrationMap = new Map<string, Registration>();

    for (const row of rows) {
      const regId = String(row.get('Registration ID') || '').trim();
      if (!regId) continue;

      const categoryStr = String(row.get('Attendee Category') || '').trim().toLowerCase().replace(/\s+/g, '_');
      // Normalize category (e.g., student, undergraduate, toddler, child, working_class)
      let category: Registration['attendees'][number]['category'] = 'working_class';
      if (categoryStr === 'toddler' || categoryStr === 'child' || categoryStr === 'secondary' || categoryStr === 'undergraduate' || categoryStr === 'working_class') {
        category = categoryStr;
      } else if (categoryStr === 'student' || categoryStr === 'undergraduate_student') {
        category = 'undergraduate';
      }

      const attendee = {
        id: `${regId}-${registrationMap.get(regId)?.attendees.length || 0}`,
        fullName: String(row.get('Attendee Name') || ''),
        gender: (row.get('Attendee Gender') === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
        category,
        phoneNumber: String(row.get('Attendee Phone') || ''),
        emailAddress: String(row.get('Attendee Email') || ''),
        region: (row.get('Attendee Region') || 'Southern Nigeria') as Registration['attendees'][number]['region'],
        localChurch: String(row.get('Attendee Local Church') || ''),
        medicalConditions: String(row.get('Medical Conditions') || ''),
      };

      if (registrationMap.has(regId)) {
        registrationMap.get(regId)!.attendees.push(attendee);
      } else {
        const dateStr = String(row.get('Date') || '');
        let registeredAt = new Date().toISOString();
        if (dateStr) {
          try {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              registeredAt = parsed.toISOString();
            }
          } catch {}
        }

        registrationMap.set(regId, {
          registrationId: regId,
          registrationType: String(row.get('Registration Type') || '').toLowerCase().includes('group') ? 'group' : 'individual',
          coordinator: {
            fullName: String(row.get('Coordinator Name') || ''),
            phoneNumber: String(row.get('Coordinator Phone') || ''),
            emailAddress: String(row.get('Coordinator Email') || ''),
            churchName: String(row.get('Coordinator Church') || ''),
          },
          attendees: [attendee],
          totalAmount: Number(row.get('Total Amount') || 0),
          paymentStatus: (row.get('Payment Status') || 'pending') as Registration['paymentStatus'],
          paymentReference: String(row.get('Payment Reference') || regId),
          flutterwaveTransactionId: String(row.get('Flutterwave Transaction ID') || ''),
          paymentProvider: row.get('Payment Provider') === 'flutterwave' ? 'flutterwave' : undefined,
          registeredAt,
          paidAt: String(row.get('Paid At') || '') || undefined,
        });
      }
    }

    return Array.from(registrationMap.values());
  } catch (error) {
    console.error('Failed to read all registrations from Google Sheets:', error);
    return [];
  }
}

export async function appendToPendingGoogleSheet(registration: Registration) {
  try {
    const sheet = await getPendingRegistrationsSheet();

    if (!sheet) {
      console.warn('Google Sheets credentials missing. Skipping pending sheet sync.');
      return;
    }

    const rows = registration.attendees.map(att => ({
      'Registration ID': registration.registrationId,
      'Registration Type': registration.registrationType === 'group' ? 'Group / Church' : 'Individual',
      'Date': new Date(registration.registeredAt).toLocaleString(),
      'Payment Status': registration.paymentStatus,
      'Payment Reference': registration.paymentReference,
      'Flutterwave Transaction ID': registration.flutterwaveTransactionId || '',
      'Paid At': registration.paidAt || '',
      'Payment Provider': registration.paymentProvider || '',
      'Total Amount': registration.totalAmount,
      'Coordinator Name': registration.coordinator.fullName,
      'Coordinator Phone': registration.coordinator.phoneNumber,
      'Coordinator Email': registration.coordinator.emailAddress,
      'Coordinator Church': registration.coordinator.churchName,
      'Attendee Name': att.fullName,
      'Attendee Gender': att.gender,
      'Attendee Category': att.category.replace('_', ' '),
      'Attendee Phone': att.phoneNumber,
      'Attendee Email': att.emailAddress,
      'Attendee Region': att.region,
      'Attendee Local Church': att.localChurch,
      'Medical Conditions': att.medicalConditions || 'None',
    }));

    await sheet.addRows(rows);
    console.log(`Successfully synced pending registration ${registration.registrationId} to Google Sheets.`);
  } catch (error) {
    console.error('Failed to append to pending Google Sheets:', error);
  }
}

export async function deleteFromPendingGoogleSheet(registrationId: string) {
  try {
    const sheet = await getPendingRegistrationsSheet();

    if (!sheet) {
      return false;
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const matchingRows = rows.filter((row) => row.get('Registration ID') === registrationId);

    for (const row of matchingRows) {
      await row.delete();
    }

    console.log(`Successfully deleted registration ${registrationId} from pending Google Sheets.`);
    return matchingRows.length > 0;
  } catch (error) {
    console.error('Failed to delete from pending Google Sheets:', error);
    return false;
  }
}

export async function getRegistrationFromPendingGoogleSheet(registrationId: string): Promise<Registration | null> {
  try {
    const sheet = await getPendingRegistrationsSheet();

    if (!sheet) {
      return null;
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const matchingRows = rows.filter((row) => row.get('Registration ID') === registrationId);

    if (matchingRows.length === 0) {
      return null;
    }

    const first = matchingRows[0];

    return {
      registrationId,
      registrationType: String(first.get('Registration Type') || '').toLowerCase().startsWith('group') ? 'group' : 'individual',
      coordinator: {
        fullName: String(first.get('Coordinator Name') || ''),
        phoneNumber: String(first.get('Coordinator Phone') || ''),
        emailAddress: String(first.get('Coordinator Email') || ''),
        churchName: String(first.get('Coordinator Church') || ''),
      },
      attendees: matchingRows.map((row, index) => ({
        id: `${registrationId}-${index}`,
        fullName: String(row.get('Attendee Name') || ''),
        gender: row.get('Attendee Gender') === 'Female' ? 'Female' : 'Male',
        category: String(row.get('Attendee Category') || '').replace(' ', '_') as Registration['attendees'][number]['category'],
        phoneNumber: String(row.get('Attendee Phone') || ''),
        emailAddress: String(row.get('Attendee Email') || ''),
        region: row.get('Attendee Region') as Registration['attendees'][number]['region'],
        localChurch: String(row.get('Attendee Local Church') || ''),
        medicalConditions: String(row.get('Medical Conditions') || ''),
      })),
      totalAmount: Number(first.get('Total Amount') || 0),
      paymentStatus: first.get('Payment Status') as Registration['paymentStatus'],
      paymentReference: String(first.get('Payment Reference') || registrationId),
      flutterwaveTransactionId: String(first.get('Flutterwave Transaction ID') || ''),
      paymentProvider: first.get('Payment Provider') === 'flutterwave' ? 'flutterwave' : undefined,
      registeredAt: new Date(String(first.get('Date') || Date.now())).toISOString(),
      paidAt: String(first.get('Paid At') || '') || undefined,
    };
  } catch (error) {
    console.error('Failed to read registration from pending Google Sheets:', error);
    return null;
  }
}

export async function getAllPendingRegistrationsFromGoogleSheet(): Promise<Registration[]> {
  try {
    const sheet = await getPendingRegistrationsSheet();

    if (!sheet) {
      return [];
    }

    const rows = await sheet.getRows<RegistrationSheetRow>();
    const registrationMap = new Map<string, Registration>();

    for (const row of rows) {
      const regId = String(row.get('Registration ID') || '').trim();
      if (!regId) continue;

      const categoryStr = String(row.get('Attendee Category') || '').trim().toLowerCase().replace(/\s+/g, '_');
      let category: Registration['attendees'][number]['category'] = 'working_class';
      if (categoryStr === 'toddler' || categoryStr === 'child' || categoryStr === 'secondary' || categoryStr === 'undergraduate' || categoryStr === 'working_class') {
        category = categoryStr;
      } else if (categoryStr === 'student' || categoryStr === 'undergraduate_student') {
        category = 'undergraduate';
      }

      const attendee = {
        id: `${regId}-${registrationMap.get(regId)?.attendees.length || 0}`,
        fullName: String(row.get('Attendee Name') || ''),
        gender: (row.get('Attendee Gender') === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
        category,
        phoneNumber: String(row.get('Attendee Phone') || ''),
        emailAddress: String(row.get('Attendee Email') || ''),
        region: (row.get('Attendee Region') || 'Southern Nigeria') as Registration['attendees'][number]['region'],
        localChurch: String(row.get('Attendee Local Church') || ''),
        medicalConditions: String(row.get('Medical Conditions') || ''),
      };

      if (registrationMap.has(regId)) {
        registrationMap.get(regId)!.attendees.push(attendee);
      } else {
        const dateStr = String(row.get('Date') || '');
        let registeredAt = new Date().toISOString();
        if (dateStr) {
          try {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              registeredAt = parsed.toISOString();
            }
          } catch {}
        }

        registrationMap.set(regId, {
          registrationId: regId,
          registrationType: String(row.get('Registration Type') || '').toLowerCase().includes('group') ? 'group' : 'individual',
          coordinator: {
            fullName: String(row.get('Coordinator Name') || ''),
            phoneNumber: String(row.get('Coordinator Phone') || ''),
            emailAddress: String(row.get('Coordinator Email') || ''),
            churchName: String(row.get('Coordinator Church') || ''),
          },
          attendees: [attendee],
          totalAmount: Number(row.get('Total Amount') || 0),
          paymentStatus: (row.get('Payment Status') || 'pending') as Registration['paymentStatus'],
          paymentReference: String(row.get('Payment Reference') || regId),
          flutterwaveTransactionId: String(row.get('Flutterwave Transaction ID') || ''),
          paymentProvider: row.get('Payment Provider') === 'flutterwave' ? 'flutterwave' : undefined,
          registeredAt,
          paidAt: String(row.get('Paid At') || '') || undefined,
        });
      }
    }

    return Array.from(registrationMap.values());
  } catch (error) {
    console.error('Failed to read all pending registrations from Google Sheets:', error);
    return [];
  }
}

