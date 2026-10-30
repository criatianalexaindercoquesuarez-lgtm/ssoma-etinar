import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cargarDetalles, cargarLogo } from '@/lib/export/datos';
import { pdfHallazgo } from '@/lib/export/pdf';
import type { HallazgoVista } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { data: h } = await db.from('v_hallazgos').select('*').eq('id', params.id).single<HallazgoVista>();
  if (!h) return NextResponse.json({ error: 'Hallazgo no encontrado' }, { status: 404 });
  const [d] = await cargarDetalles(db, [h], { fotos: true, maxFotos: 6 });
  const buf = await pdfHallazgo(d, await cargarLogo(req.nextUrl.origin));
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Reporte_${h.codigo}.pdf"`, 'Cache-Control': 'no-store' },
  });
}
