// ============================================
// Training of the Spirit 2026 - Type Definitions
// ============================================

export type AttendeeCategory = 'toddler' | 'child' | 'secondary' | 'undergraduate' | 'working_class';

export type Gender = 'Male' | 'Female';

export type Region = 'Southern Nigeria' | 'Northern Nigeria' | 'Outside Nigeria';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'free';

export type RegistrationType = 'individual' | 'group';

export interface Attendee {
  id: string;
  fullName: string;
  gender: Gender | '';
  category: AttendeeCategory | '';
  phoneNumber: string;
  emailAddress: string;
  region: Region | '';
  localChurch: string;
  medicalConditions: string;
}

export interface CoordinatorInfo {
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  churchName: string;
}

export interface Registration {
  registrationId: string;
  registrationType?: RegistrationType;
  coordinator: CoordinatorInfo;
  attendees: Attendee[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  registeredAt: string;
  paidAt?: string;
  flutterwaveTransactionId?: string;
  paymentProvider?: 'flutterwave' | 'manual';
}

export interface CategoryConfig {
  id: AttendeeCategory;
  label: string;
  ageRange: string;
  price: number;
  color: string;
  icon: string;
}
