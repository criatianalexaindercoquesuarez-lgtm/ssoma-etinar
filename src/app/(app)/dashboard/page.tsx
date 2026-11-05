import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calcularIndicadores, obtenerMatriz } from '@/lib/matriz';
import { esRestringido } from '@/lib/types';
import HallazgoCard from '@/components/HallazgoCard';
import { Kpi } from '@/components/Barras';

export const dynamic = 'force-dynamic';

const ORDEN: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user?.id || '').single();
  const hs = await obtenerMatriz(supabase, {});
  const abiertos = hs.filter((h) => h.estado !== 'cerrado');
  const ordenar = <T extends (typeof hs)[number]>(xs: T[]) => [...xs].sort((a, b) =>
    (a.estado_efectivo === 'vencido' ? -1 : 0) - (b.estado_efectivo === 'vencido' ? -1 : 0)
    || (ORDEN[a.prioridad || 'baja'] - ORDEN[b.prioridad || 'baja']));

  // ── Vista del responsable: solo las observaciones que se le enviaron ──
  if (esRestringido(perfil?.rol)) {
    const mias = hs.filter((h) => h.responsable_id === user?.id || h.verificador_id === user?.id);
    const porAtender = ordenar(mias.filter((h) => h.estado === 'pendiente' || h.estado === 'en_proceso'));
    const enRevision = mias.filter((h) => h.estado === 'en_verificacion');
    const cerradas = mias.filter((h) => h.estado === 'cerrado').reverse();
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-base font-semibold">Mis observaciones para corrección</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Kpi label="Por atender" value={porAtender.length} color="#854F0B" />
          <Kpi label="Vencidas" value={mias.filter((h) => h.estado_efectivo === 'vencido').length} color="#A32D2D" />
          <Kpi label="En revisión SST" value={enRevision.length} color="#185FA5" />
          <Kpi label="Cerradas" value={cerradas.length} color="#3B6D11" />
        </div>
        <Seccion titulo="Por atender" items={porAtender} vacio="✅ No tiene observaciones pendientes" />
        {enRevision.length > 0 && <Seccion titulo="Enviadas a revisión de SST" items={enRevision} />}
        {cerradas.length > 0 && <Seccion titulo="Cerradas" items={cerradas.slice(0, 20)} />}
      </div>
    );
  }

  // ── Vista SST / supervisión ──
  const ind = calcularIndicadores(hs, 0);
  const mios = abiertos.filter((h) => h.responsable_id === user?.id || h.verificador_id === user?.id);
  const porRevisar = abiertos.filter((h) => h.estado === 'en_verificacion');
  const activos = ordenar(abiertos).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Kpi label="Total hallazgos" value={ind.totalHallazgos} />
        <Kpi label="Pendientes / en proceso" value={ind.porEstado.pendiente + ind.porEstado.en_proceso} color="#854F0B" />
        <Kpi label="En verificación SST" value={ind.porEstado.en_verificacion} color="#185FA5" />
        <Kpi label="Vencidos" value={ind.porEstado.vencido} color="#A32D2D" />
        <Kpi label="Cerrados" value={`${ind.cerrados} · ${ind.pctCumplimiento}%`} color="#3B6D11" />
      </div>
      <div className="flex gap-2">
        <Link href="/inspecciones/nueva" className="flex-1 text-center bg-[#185FA5] text-white text-sm font-medium py-2.5 rounded-lg">+ Nueva inspección</Link>
        <Link href="/hallazgos/nuevo" className="flex-1 text-center bg-white border border-[#185FA5] text-[#185FA5] text-sm font-medium py-2.5 rounded-lg">+ Hallazgo</Link>
      </div>
      {mios.length > 0 && <Seccion titulo={`Asignados a mí (${mios.length})`} items={mios} />}
      {porRevisar.length > 0 && <Seccion titulo={`Evidencias por verificar (${porRevisar.length})`} items={porRevisar} />}
      <Seccion titulo="Hallazgos activos prioritarios" items={activos} vacio="✅ No hay hallazgos activos" />
    </div>
  );
}

function Seccion({ titulo, items, vacio }: { titulo: string; items: Parameters<typeof HallazgoCard>[0]['h'][]; vacio?: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wide mb-2">{titulo}</h2>
      {items.length === 0 && vacio && <p className="text-sm text-[#5F5E5A] text-center py-6">{vacio}</p>}
      <div className="grid sm:grid-cols-2 gap-2">{items.map((h) => <HallazgoCard key={h.id} h={h} />)}</div>
    </div>
  );
}
