const fs = require('fs');
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      // Remove quotes if any
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value;
    }
  });
}

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

async function run() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error('Error: Google Sheets credentials not found in env.');
    process.exit(1);
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const serviceAccountAuth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();

  // Load Registrations sheet
  const mainSheet = doc.sheetsByTitle['Registrations'];
  let mainRegIds = new Set();
  if (mainSheet) {
    const rows = await mainSheet.getRows();
    rows.forEach(row => {
      const regId = row.get('Registration ID');
      if (regId) mainRegIds.add(regId);
    });
  }

  // Load / Create Pending Registrations sheet
  let pendingSheet = doc.sheetsByTitle['Pending Registrations'];
  if (!pendingSheet) {
    pendingSheet = await doc.addSheet({
      title: 'Pending Registrations',
      headerValues: REGISTRATION_HEADERS
    });
  } else {
    await pendingSheet.loadHeaderRow();
  }

  const pendingRows = await pendingSheet.getRows();
  let pendingRegIds = new Set();
  pendingRows.forEach(row => {
    const regId = row.get('Registration ID');
    if (regId) pendingRegIds.add(regId);
  });

  // Read local registrations
  const localFilePath = path.join(__dirname, '../data/tos2026-registrations.json');
  if (!fs.existsSync(localFilePath)) {
    console.log('No local registrations file found at data/tos2026-registrations.json');
    return;
  }

  const localContent = fs.readFileSync(localFilePath, 'utf-8');
  const localRegs = JSON.parse(localContent);

  console.log(`Found ${localRegs.length} local registrations.`);

  let syncedCount = 0;
  for (const reg of localRegs) {
    const regId = reg.registrationId;

    if (mainRegIds.has(regId)) {
      console.log(`Registration ${regId} is already paid in the main sheet. Skipping.`);
      continue;
    }

    if (pendingRegIds.has(regId)) {
      console.log(`Registration ${regId} is already in the pending sheet. Skipping.`);
      continue;
    }

    // Add to pending sheet
    console.log(`Syncing pending registration ${regId} to Google Sheets...`);
    const rowsToAdd = reg.attendees.map(att => ({
      'Registration ID': reg.registrationId,
      'Registration Type': reg.registrationType === 'group' ? 'Group / Church' : 'Individual',
      'Date': new Date(reg.registeredAt).toLocaleString(),
      'Payment Status': reg.paymentStatus,
      'Payment Reference': reg.paymentReference || '',
      'Flutterwave Transaction ID': reg.flutterwaveTransactionId || '',
      'Paid At': reg.paidAt || '',
      'Payment Provider': reg.paymentProvider || '',
      'Total Amount': reg.totalAmount,
      'Coordinator Name': reg.coordinator.fullName,
      'Coordinator Phone': reg.coordinator.phoneNumber,
      'Coordinator Email': reg.coordinator.emailAddress,
      'Coordinator Church': reg.coordinator.churchName,
      'Attendee Name': att.fullName,
      'Attendee Gender': att.gender,
      'Attendee Category': att.category.replace('_', ' '),
      'Attendee Phone': att.phoneNumber,
      'Attendee Email': att.emailAddress,
      'Attendee Region': att.region,
      'Attendee Local Church': att.localChurch,
      'Medical Conditions': att.medicalConditions || 'None',
    }));

    await pendingSheet.addRows(rowsToAdd);
    syncedCount++;
  }

  console.log(`Finished! Synced ${syncedCount} registrations.`);
}

run().catch(console.error);
