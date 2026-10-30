import { NextRequest, NextResponse } from 'next/server';
import { ejecutarAccion, type Accion } from '@/lib/workflow';

const ACCIONES: Accion[] = ['recibir', 'avance', 'enviar_verificacion', 'aprobar', 'rechazar', 'reasignar', 'notificar'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { accion, ...body } = await req.json();
  if (!ACCIONES.includes(accion)) return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  const r = await ejecutarAccion(params.id, accion, body);
  return NextResponse.json(r, { status: r.status });
}
