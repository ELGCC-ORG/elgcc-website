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
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value;
    }
  });
}

async function run() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error('Error: Credentials not found in env.');
    process.exit(1);
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  console.log('Connecting to Google Sheets...');
  const serviceAccountAuth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();

  console.log('Spreadsheet Title:', doc.title);
  
  const mainSheet = doc.sheetsByTitle['Registrations'];
  if (!mainSheet) {
    console.error('Main sheet Registrations not found.');
    return;
  }

  const rows = await mainSheet.getRows();
  console.log(`Total rows in Registrations: ${rows.length}`);
  
  console.log('\nLast 10 rows in Registrations:');
  const last10 = rows.slice(-10);
  last10.forEach((row, i) => {
    console.log(`[${rows.length - 10 + i}] Reg ID: ${row.get('Registration ID')}, Name: ${row.get('Attendee Name')}, Status: ${row.get('Payment Status')}`);
  });

  const pendingSheet = doc.sheetsByTitle['Pending Registrations'];
  if (pendingSheet) {
    const pRows = await pendingSheet.getRows();
    console.log(`\nTotal rows in Pending Registrations: ${pRows.length}`);
    const lastP = pRows.slice(-10);
    lastP.forEach((row, i) => {
      console.log(`[P-${pRows.length - 10 + i}] Reg ID: ${row.get('Registration ID')}, Name: ${row.get('Attendee Name')}`);
    });
  } else {
    console.log('\nPending Registrations sheet not found.');
  }
}

run().catch(console.error);
