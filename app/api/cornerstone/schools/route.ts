import { NextResponse } from 'next/server';
import { getAllSchools, addCustomSchool } from '@/lib/cornerstone/schools';
import { getAllRecords } from '@/lib/cornerstone/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const liveRecords = await getAllRecords();
    const schools = getAllSchools(liveRecords);
    const locations = Object.keys(schools);
    return NextResponse.json({
      success: true,
      schools,
      locations,
    });
  } catch (error: any) {
    const schools = getAllSchools();
    return NextResponse.json({
      success: true,
      schools,
      locations: Object.keys(schools),
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { location, school } = body;

    if (!location || !school) {
      return NextResponse.json(
        { success: false, error: 'Location and school are required' },
        { status: 400 }
      );
    }

    const added = addCustomSchool(location, school);
    const schools = getAllSchools();

    return NextResponse.json({
      success: true,
      added,
      schools,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add school' },
      { status: 500 }
    );
  }
}
