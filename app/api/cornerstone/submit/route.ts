import { NextResponse } from 'next/server';
import { addRecordToSheet } from '@/lib/cornerstone/sheets';
import { addCustomSchool } from '@/lib/cornerstone/schools';
import { CornerstoneRecord } from '@/lib/cornerstone/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      location,
      school,
      isCustomSchool,
      fullName,
      phone,
      isWhatsApp,
      homeAddress,
      classCategory,
      notes,
      recordedBy,
    } = body;

    if (!location || !school || !fullName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Strategic location, school, full name, and phone number are required.' },
        { status: 400 }
      );
    }

    // If marked as custom school or newly typed school, register it to the group's directory
    if (isCustomSchool || school.trim()) {
      addCustomSchool(location, school.trim());
    }

    const record: CornerstoneRecord = {
      timestamp: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
      location: location.toUpperCase().trim(),
      school: school.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      isWhatsApp: Boolean(isWhatsApp),
      homeAddress: (homeAddress || '').trim(),
      classCategory: (classCategory || 'Secondary (Senior: SS1-SS3)').trim(),
      notes: (notes || '').trim(),
      recordedBy: (recordedBy || '').trim(),
    };

    const result = await addRecordToSheet(record);

    return NextResponse.json({
      success: true,
      id: result.id,
      sheetSaved: result.sheetSaved,
      message: 'Contact successfully recorded!',
    });
  } catch (error: any) {
    console.error('Error submitting cornerstone record:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit record.' },
      { status: 500 }
    );
  }
}

