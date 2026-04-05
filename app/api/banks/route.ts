import { NextResponse } from 'next/server';
import { VIETNAM_BANKS } from '@/lib/vietnam-banks';

export async function GET() {
  return NextResponse.json(VIETNAM_BANKS);
}
