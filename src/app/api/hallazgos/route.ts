import { NextRequest, NextResponse } from 'next/server';
import { crearHallazgo } from '@/lib/workflow';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await crearHallazgo(body);
  return NextResponse.json(r, { status: r.status });
}
