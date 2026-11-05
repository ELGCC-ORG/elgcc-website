export type StrategicLocation =
  | 'IKOLABA'
  | 'UI'
  | 'UCH'
  | 'BODIJA'
  | 'SANGO'
  | 'CHALLENGE'
  | 'APATA'
  | 'MAPO'
  | 'IWOROAD'
  | 'BASHORUN'
  | 'ILESHA'
  | 'IKIRUN'
  | 'ILE-IFE'
  | 'OTHERS';

export type StudentClassCategory =
  | 'Secondary (Senior: SS1-SS3)'
  | 'Junior Class (JSS1-JSS3)'
  | 'Primary Class'
  | 'Tertiary / Other';

export interface CornerstoneRecord {
  id?: string;
  timestamp: string;
  location: StrategicLocation | string;
  school: string;
  fullName: string;
  phone: string;
  isWhatsApp: boolean;
  homeAddress: string;
  classCategory: StudentClassCategory | string;
  notes?: string;
  recordedBy?: string;
}

export interface CornerstoneSchoolData {
  [location: string]: string[];
}

