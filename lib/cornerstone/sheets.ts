import fs from 'fs';
import path from 'path';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { CornerstoneRecord } from './types';

const SHEET_TITLE = 'Cornerstone 2026 Records';

const HEADERS = [
  'Record ID',
  'Date & Time',
  'Strategic Location',
  'School',
  'Full Name',
  'Phone Number',
  'WhatsApp',
  'Class / Category',
  'Home Address',
  'Notes',
  'Recorded By',
];

const LOCAL_RECORDS_PATH = path.join(process.cwd(), 'data', 'cornerstone-records.json');

function getLocalRecords(): CornerstoneRecord[] {
  try {
    if (fs.existsSync(LOCAL_RECORDS_PATH)) {
      const data = fs.readFileSync(LOCAL_RECORDS_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local records:', err);
  }
  return [];
}

function saveLocalRecord(record: CornerstoneRecord) {
  try {
    const list = getLocalRecords();
    list.unshift(record);
    fs.writeFileSync(LOCAL_RECORDS_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local record backup:', err);
  }
}

function getGoogleCredentials() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return null;
  }
  return { spreadsheetId, clientEmail, privateKey };
}

let cachedDoc: GoogleSpreadsheet | null = null;

async function getDoc() {
  if (cachedDoc) return cachedDoc;

  const creds = getGoogleCredentials();
  if (!creds) return null;

  const serviceAccountAuth = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(creds.spreadsheetId, serviceAccountAuth);
  await doc.loadInfo();
  cachedDoc = doc;
  return doc;
}

async function getOrCreateSheet() {
  const doc = await getDoc();
  if (!doc) return null;

  let sheet = doc.sheetsByTitle[SHEET_TITLE];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: SHEET_TITLE,
      headerValues: HEADERS,
    });
    return sheet;
  }

  // Ensure headers exist
  try {
    if (!sheet.headerValues || sheet.headerValues.length === 0) {
      await sheet.loadHeaderRow();
    }
  } catch {
    await sheet.setHeaderRow(HEADERS);
  }

  return sheet;
}

export async function addRecordToSheet(record: CornerstoneRecord): Promise<{ success: boolean; id: string; sheetSaved: boolean }> {
  const recordId = `CRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  record.id = recordId;

  // Always save to local JSON first for maximum speed and zero data-loss resilience
  saveLocalRecord(record);

  let sheetSaved = false;
  try {
    const sheet = await getOrCreateSheet();
    if (sheet) {
      await sheet.addRow({
        'Record ID': recordId,
        'Date & Time': record.timestamp || new Date().toLocaleString('en-NG'),
        'Strategic Location': record.location,
        'School': record.school,
        'Full Name': record.fullName,
        'Phone Number': record.phone,
        'WhatsApp': record.isWhatsApp ? 'Yes' : 'No',
        'Class / Category': record.classCategory,
        'Home Address': record.homeAddress,
        'Notes': record.notes || '',
        'Recorded By': record.recordedBy || '',
      });
      sheetSaved = true;
    }
  } catch (error) {
    console.error('Warning: Failed to append to Google Sheets, saved in local backup:', error);
  }

  return { success: true, id: recordId, sheetSaved };
}

export async function getAllRecords(): Promise<CornerstoneRecord[]> {
  try {
    const sheet = await getOrCreateSheet();
    if (sheet) {
      const rows = await sheet.getRows();
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.get('Record ID') || '',
          timestamp: r.get('Date & Time') || '',
          location: r.get('Strategic Location') || '',
          school: r.get('School') || '',
          fullName: r.get('Full Name') || '',
          phone: r.get('Phone Number') || '',
          isWhatsApp: (r.get('WhatsApp') || '').toLowerCase() === 'yes',
          classCategory: r.get('Class / Category') || '',
          homeAddress: r.get('Home Address') || '',
          notes: r.get('Notes') || '',
          recordedBy: r.get('Recorded By') || '',
        }));
      }
    }
  } catch (error) {
    console.error('Error reading from Google Sheets, falling back to local records:', error);
  }

  // Fallback to local records
  return getLocalRecords();
}

