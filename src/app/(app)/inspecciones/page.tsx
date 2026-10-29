import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtFechaHora } from '@/lib/types';
import { modalidadLabel } from '@/lib/modalidades';

export default async function InspeccionesPage({ searchParams }: { searchParams: { obra?: string } }) {
  const supabase = await createClient();
  let q = supabase.from('inspecciones')
    .select('*, proyectos(nombre,codigo), inspector:perfiles!inspecciones_inspector_id_fkey(nombre), hallazgos(id,estado)')
    .eq('eliminado', false).order('fecha_hora', { ascending: false }).limit(200);
  if (searchParams.obra) q = q.eq('proyecto_id', searchParams.obra);
  const { data: inspecciones } = await q;
  const { data: proyectos } = await supabase.from('proyectos').select('id,nombre').order('nombre');

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Inspecciones</h2>
        <Link href="/inspecciones/nueva" className="bg-[#185FA5] text-white text-sm font-medium px-4 py-2 rounded-lg">+ Nueva inspección</Link>
      </div>
      <form className="flex gap-2">
        <select name="obra" defaultValue={searchParams.obra || ''} className="flex-1 border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas las obras</option>
          {(proyectos || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button className="bg-[#F1EFE8] text-[#0C447C] text-sm px-3 rounded-lg">Filtrar</button>
      </form>
      {(!inspecciones || inspecciones.length === 0) && (
        <p className="text-sm text-[#5F5E5A] text-center py-10">Aún no hay inspecciones registradas.</p>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {(inspecciones || []).map((i) => {
          const hs = (i.hallazgos || []) as { estado: string }[];
          const abiertos = hs.filter((h) => h.estado !== 'cerrado').length;
          return (
            <Link key={i.id} href={`/inspecciones/${i.id}`} className="block bg-white border border-[#E3E1D9] rounded-xl p-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-[#185FA5]">{i.codigo}</span>
                <span className="text-[#5F5E5A]">{fmtFechaHora(i.fecha_hora)}</span>
              </div>
              <p className="text-sm font-semibold">🏗️ {i.proyectos?.nombre}</p>
              <p className="text-xs text-[#5F5E5A]">{[i.area, i.ubicacion, i.nivel, i.frente].filter(Boolean).join(' · ') || '—'}</p>
              <p className="text-xs text-[#5F5E5A]">{modalidadLabel(i.modalidad)} · Inspector: {i.inspector?.nombre || '—'}</p>
              <div className="flex gap-2 mt-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-[#E6F1FB] text-[#0C447C]">{hs.length} hallazgo(s)</span>
                {abiertos > 0 && <span className="px-2 py-0.5 rounded-full bg-[#FAEEDA] text-[#854F0B]">{abiertos} abierto(s)</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
