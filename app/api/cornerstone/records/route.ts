import { NextResponse } from 'next/server';
import { getAllRecords } from '@/lib/cornerstone/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const query = searchParams.get('query')?.toLowerCase();

    let records = await getAllRecords();

    if (location && location !== 'ALL') {
      records = records.filter(
        (r) => r.location?.toUpperCase() === location.toUpperCase()
      );
    }

    if (query) {
      records = records.filter(
        (r) =>
          r.fullName?.toLowerCase().includes(query) ||
          r.phone?.toLowerCase().includes(query) ||
          r.school?.toLowerCase().includes(query) ||
          r.homeAddress?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error: any) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch records.' },
      { status: 500 }
    );
  }
}
