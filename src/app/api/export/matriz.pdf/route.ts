import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leerFiltros } from '@/lib/matriz';
import { cargarLogo, cargarReporteMatriz, describirFiltros } from '@/lib/export/datos';
import { pdfMatriz } from '@/lib/export/pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function GET(req: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const f = leerFiltros(req.nextUrl.searchParams);
  const r = await cargarReporteMatriz(db, f, true);
  const buf = await pdfMatriz(r, describirFiltros(f, r), await cargarLogo(req.nextUrl.origin));
  const nombre = `Matriz_Hallazgos_${r.inspeccion?.codigo || 'ETINAR'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}"`, 'Cache-Control': 'no-store' },
  });
}
