import { NextRequest, NextResponse } from 'next/server';
import { allSermons } from '@/lib/teachings';

interface ListenRouteProps {
  params: {
    sermonId: string;
  };
}

export function GET(req: NextRequest, { params }: ListenRouteProps) {
  const sermonId = decodeURIComponent(params.sermonId);
  const sermon = allSermons.find((item) => item.id === sermonId);

  if (!sermon || sermon.unavailable) {
    return NextResponse.redirect(new URL('/teachings', req.url), 302);
  }

  return NextResponse.redirect(sermon.audioUrl, 302);
}
