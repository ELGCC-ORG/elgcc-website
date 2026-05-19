import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationId, calculatePriceBreakdown } from '@/lib/tos2026/pricing';
import { Attendee, CoordinatorInfo, Registration, RegistrationType } from '@/lib/tos2026/types';

import { appendToGoogleSheet, getAllRegistrationsFromGoogleSheet } from '@/lib/tos2026/sheets';
import { sendConfirmationEmail } from '@/lib/tos2026/email';
import { saveLocalRegistration, getLocalRegistrations } from '@/lib/tos2026/registrations';
import {
  createFlutterwavePaymentLink,
  getFlutterwaveTxRef,
  isFlutterwaveConfigured,
} from '@/lib/tos2026/flutterwave';

function requiresOnlinePayment() {
  return process.env.TOS_REQUIRE_FLUTTERWAVE_PAYMENT !== '0';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coordinator, attendees, registrationType } = body as {
      coordinator: CoordinatorInfo;
      attendees: Attendee[];
      registrationType?: RegistrationType;
    };
    const safeRegistrationType: RegistrationType = registrationType === 'group' ? 'group' : 'individual';

    // Validate registration contact
    if (
      !coordinator?.fullName?.trim() ||
      !coordinator?.phoneNumber?.trim() ||
      !coordinator?.emailAddress?.trim() ||
      !coordinator?.churchName?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing registration contact information' },
        { status: 400 }
      );
    }

    // Validate attendees
    if (!attendees || attendees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one attendee is required' },
        { status: 400 }
      );
    }

    for (const att of attendees) {
      if (!att.fullName?.trim() || !att.gender || !att.category || !att.region) {
        return NextResponse.json(
          { success: false, error: `Incomplete information for attendee: ${att.fullName || 'Unknown'}` },
          { status: 400 }
        );
      }
    }

    // Calculate total
    const { total } = calculatePriceBreakdown(attendees);
    const registrationId = generateRegistrationId();
    const flutterwaveConfigured = isFlutterwaveConfigured();
    const paymentReference = flutterwaveConfigured ? getFlutterwaveTxRef(registrationId) : '';

    // Build registration record
    const registration: Registration = {
      registrationId,
      registrationType: safeRegistrationType,
      coordinator,
      attendees,
      totalAmount: total,
      paymentStatus: 'pending',
      paymentReference,
      paymentProvider: flutterwaveConfigured ? 'flutterwave' : undefined,
      registeredAt: new Date().toISOString(),
    };

    // Save to local file (fallback storage)
    try {
      saveLocalRegistration(registration);
    } catch (fsError) {
      // On Vercel, filesystem is read-only — log and continue
      console.log('File storage unavailable (expected on Vercel):', fsError);
    }

    // Sync to Google Sheets (if credentials are set)
    await appendToGoogleSheet(registration);

    if (flutterwaveConfigured) {
      const { paymentLink, txRef } = await createFlutterwavePaymentLink(
        { ...registration, paymentReference },
        req.nextUrl.origin
      );

      return NextResponse.json({
        success: true,
        registrationId,
        total,
        paymentReference: txRef,
        paymentLink,
        message: 'Registration recorded. Redirecting to Flutterwave for payment.',
      });
    }

    if (requiresOnlinePayment()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Online payment is not configured yet. Please contact the ELGCC admin team.',
        },
        { status: 503 }
      );
    }

    // Local/manual fallback mode. Disable this in production by leaving
    // TOS_REQUIRE_FLUTTERWAVE_PAYMENT unset or set to any value except "0".
    await sendConfirmationEmail(registration);

    return NextResponse.json({
      success: true,
      registrationId,
      total,
      paymentLink: null,
      message: 'Registration recorded. Online payment is not configured yet.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for admin to view registrations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get('password');

  const adminPassword = process.env.TOS_ADMIN_PASSWORD || 'tos2026admin';
  if (password !== adminPassword) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Fetch local and Google Sheet registrations
    const localData = getLocalRegistrations();
    let sheetsData: Registration[] = [];
    
    try {
      sheetsData = await getAllRegistrationsFromGoogleSheet();
    } catch (sheetErr) {
      console.error('Error fetching from Google Sheets in admin GET:', sheetErr);
    }

    // Merge both sources (deduplicating by registrationId, preferring paid/completed status)
    const mergedMap = new Map<string, Registration>();
    
    // First put sheets data (primary persistent store)
    for (const reg of sheetsData) {
      mergedMap.set(reg.registrationId, reg);
    }
    
    // Then merge local data (if local data has a different/newer state, or if sheets lacks it)
    for (const reg of localData) {
      const existing = mergedMap.get(reg.registrationId);
      if (!existing) {
        mergedMap.set(reg.registrationId, reg);
      } else {
        // If local is paid but sheet is pending, prefer the local
        if (reg.paymentStatus === 'paid' && existing.paymentStatus !== 'paid') {
          mergedMap.set(reg.registrationId, {
            ...existing,
            paymentStatus: 'paid',
            paidAt: reg.paidAt || existing.paidAt || new Date().toISOString(),
            flutterwaveTransactionId: reg.flutterwaveTransactionId || existing.flutterwaveTransactionId,
          });
        }
      }
    }

    const data = Array.from(mergedMap.values());
    return NextResponse.json({
      success: true,
      registrations: data,
      debug: {
        localCount: localData ? localData.length : 0,
        sheetsCount: sheetsData ? sheetsData.length : 0,
      }
    });
  } catch (error) {
    console.error('Failed to get registrations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      registrations: []
    });
  }
}
