import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { leerFiltros, obtenerMatriz, filtrosAQuery, calcularIndicadores } from '@/lib/matriz';
import FiltrosMatriz from '@/components/FiltrosMatriz';
import HallazgoCard from '@/components/HallazgoCard';

export const dynamic = 'force-dynamic';

export default async function MatrizPage({ searchParams }: { searchParams: Record<string, string> }) {
  const supabase = await createClient();
  const f = leerFiltros(searchParams);
  const hs = await obtenerMatriz(supabase, f);
  const ind = calcularIndicadores(hs, 0);
  const { data: proyectos } = await supabase.from('proyectos').select('id,nombre').order('nombre');
  const { data: perfiles } = await supabase.from('perfiles').select('id,nombre').order('nombre');
  const q = filtrosAQuery(f);
  const lista = [...hs].reverse();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-base font-semibold">Matriz de hallazgos</h2>
        <div className="flex gap-2">
          <a href={`/api/export/matriz.xlsx?${q}`} className="text-xs bg-[#EAF3DE] text-[#3B6D11] font-semibold px-3 py-2 rounded-lg">⬇ Excel</a>
          <a href={`/api/export/matriz.pdf?${q}`} className="text-xs bg-[#E6F1FB] text-[#0C447C] font-semibold px-3 py-2 rounded-lg">⬇ PDF</a>
          <Link href="/hallazgos/nuevo" className="bg-[#185FA5] text-white text-xs font-medium px-3 py-2 rounded-lg">+ Nuevo</Link>
        </div>
      </div>
      <FiltrosMatriz f={f} proyectos={proyectos || []} responsables={perfiles || []} />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {[
          ['Total', ind.totalHallazgos, '#0C447C'], ['Pendientes', ind.porEstado.pendiente, '#5F5E5A'],
          ['En proceso', ind.porEstado.en_proceso, '#854F0B'], ['Verificación', ind.porEstado.en_verificacion, '#185FA5'],
          ['Vencidos', ind.porEstado.vencido, '#A32D2D'], ['Cerrados', `${ind.cerrados} (${ind.pctCumplimiento}%)`, '#3B6D11'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="bg-white border border-[#E3E1D9] rounded-xl p-2">
            <div className="text-[10px] text-[#5F5E5A]">{l}</div>
            <div className="text-base font-bold" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>
      {lista.length === 0 && <p className="text-sm text-[#5F5E5A] text-center py-10">No hay hallazgos con estos filtros.</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        {lista.map((h) => <HallazgoCard key={h.id} h={h} />)}
      </div>
    </div>
  );
}
