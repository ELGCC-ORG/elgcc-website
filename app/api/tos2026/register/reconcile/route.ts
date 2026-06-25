import { NextRequest, NextResponse } from 'next/server';
import { verifyFlutterwaveTransactionByRef } from '@/lib/tos2026/flutterwave';
import {
  markFlutterwaveRegistrationPaid,
  markRegistrationPaidManually,
} from '@/lib/tos2026/payments';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, registrationId, action } = body as {
      password?: string;
      registrationId?: string;
      action?: 'verify_flutterwave' | 'force_paid';
    };

    const adminPassword = process.env.TOS_ADMIN_PASSWORD || 'tos2026admin';
    if (!password || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Missing registration ID' },
        { status: 400 }
      );
    }

    if (action === 'verify_flutterwave') {
      try {
        const transaction = await verifyFlutterwaveTransactionByRef(registrationId);
        
        if (transaction.status === 'successful' || transaction.status === 'succeeded') {
          const registration = await markFlutterwaveRegistrationPaid(transaction);
          return NextResponse.json({
            success: true,
            message: 'Payment verified and registration activated successfully via Flutterwave.',
            registration,
          });
        }

        return NextResponse.json({
          success: false,
          error: `Flutterwave transaction status is '${transaction.status || 'unknown'}'. Registration was not marked paid.`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Verification failed. The transaction might not exist on Flutterwave yet.',
        });
      }
    } else if (action === 'force_paid') {
      try {
        const registration = await markRegistrationPaidManually(registrationId, 'MANUAL_FORCE');
        return NextResponse.json({
          success: true,
          message: 'Registration manually marked as Paid successfully.',
          registration,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to manually mark paid.',
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid or unsupported action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
