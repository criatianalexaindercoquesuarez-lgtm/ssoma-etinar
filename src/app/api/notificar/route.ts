import { NextRequest, NextResponse } from 'next/server';
import { ejecutarAccion } from '@/lib/workflow';

// Compatibilidad: reenvío manual de la notificación de un hallazgo.
export async function POST(req: NextRequest) {
  const { hallazgoId } = await req.json();
  const r = await ejecutarAccion(hallazgoId, 'notificar', {});
  return NextResponse.json(r, { status: r.status });
}
