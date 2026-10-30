import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hoyEC, rangoPeriodo } from '@/lib/matriz';
import { cargarLogo, cargarReporteMatriz, describirFiltros } from '@/lib/export/datos';
import { pdfPeriodo } from '@/lib/export/pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function GET(req: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const periodo = sp.get('periodo') === 'mes' ? 'mes' : 'semana';
  const r0 = rangoPeriodo(periodo, sp.get('fecha') || hoyEC());
  const f = { desde: r0.desde, hasta: r0.hasta, obra: sp.get('obra') || undefined };
  const r = await cargarReporteMatriz(db, f, false);
  const buf = await pdfPeriodo(r, r0.etiqueta, describirFiltros(f, r), await cargarLogo(req.nextUrl.origin));
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Reporte_SST_${periodo}_${r0.desde}.pdf"`, 'Cache-Control': 'no-store' },
  });
}
