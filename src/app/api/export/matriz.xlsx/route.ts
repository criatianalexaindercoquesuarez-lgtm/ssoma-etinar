import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leerFiltros } from '@/lib/matriz';
import { cargarReporteMatriz, describirFiltros } from '@/lib/export/datos';
import { generarExcel } from '@/lib/export/excel';

export const dynamic = 'force-dynamic';
export const maxDuration = 26;

export async function GET(req: NextRequest) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const f = leerFiltros(req.nextUrl.searchParams);
  const r = await cargarReporteMatriz(db, f, false);
  const buf = await generarExcel(r, describirFiltros(f, r));
  const nombre = `Matriz_Hallazgos_${r.inspeccion?.codigo || 'ETINAR'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
