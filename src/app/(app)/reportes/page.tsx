import { createClient } from '@/lib/supabase/server';
import { calcularIndicadores, contarInspecciones, filtrosAQuery, hoyEC, obtenerMatriz, rangoPeriodo } from '@/lib/matriz';
import { PRIORIDAD_COLOR, PRIORIDAD_LABEL, type Prioridad } from '@/lib/types';
import { factorLabel } from '@/lib/gtc45';
import { Barras, Kpi } from '@/components/Barras';

export const dynamic = 'force-dynamic';

export default async function ReportesPage({ searchParams }: { searchParams: { periodo?: string; fecha?: string; obra?: string } }) {
  const supabase = await createClient();
  const periodo = (searchParams.periodo === 'mes' ? 'mes' : 'semana') as 'semana' | 'mes';
  const fecha = searchParams.fecha || hoyEC();
  const r = rangoPeriodo(periodo, fecha);
  const f = { desde: r.desde, hasta: r.hasta, obra: searchParams.obra };
  const [hs, nInsp, { data: proyectos }] = await Promise.all([
    obtenerMatriz(supabase, f), contarInspecciones(supabase, f), supabase.from('proyectos').select('id,nombre').order('nombre'),
  ]);
  const ind = calcularIndicadores(hs, nInsp);
  const q = filtrosAQuery(f);
  const qPdf = new URLSearchParams({ periodo, fecha, ...(searchParams.obra ? { obra: searchParams.obra } : {}) }).toString();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-base font-semibold">Reportes {periodo === 'semana' ? 'semanales' : 'mensuales'}</h2>
        <div className="flex gap-2">
          <a href={`/api/export/reporte.pdf?${qPdf}`} className="text-xs bg-[#E6F1FB] text-[#0C447C] font-semibold px-3 py-2 rounded-lg">⬇ Reporte PDF</a>
          <a href={`/api/export/matriz.xlsx?${q}`} className="text-xs bg-[#EAF3DE] text-[#3B6D11] font-semibold px-3 py-2 rounded-lg">⬇ Excel del periodo</a>
        </div>
      </div>
      <form className="bg-white border border-[#E3E1D9] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <label>Periodo
          <select name="periodo" defaultValue={periodo} className="w-full border border-[#E3E1D9] rounded-lg px-2 py-2 text-sm bg-white">
            <option value="semana">Semanal</option><option value="mes">Mensual</option>
          </select>
        </label>
        <label>Fecha dentro del periodo<input type="date" name="fecha" defaultValue={fecha} className="w-full border border-[#E3E1D9] rounded-lg px-2 py-2 text-sm" /></label>
        <label>Obra
          <select name="obra" defaultValue={searchParams.obra || ''} className="w-full border border-[#E3E1D9] rounded-lg px-2 py-2 text-sm bg-white">
            <option value="">Todas</option>{(proyectos || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="flex items-end"><button className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm w-full">Ver</button></div>
      </form>
      <p className="text-xs text-[#5F5E5A] capitalize">{r.etiqueta} · {r.desde} a {r.hasta}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Inspecciones realizadas" value={ind.totalInspecciones} />
        <Kpi label="Hallazgos identificados" value={ind.totalHallazgos} />
        <Kpi label="Cerrados / % cumplimiento" value={`${ind.cerrados} · ${ind.pctCumplimiento}%`} color="#3B6D11" sub={`${ind.pctCierreEnPlazo}% cerrados dentro del plazo`} />
        <Kpi label="Tiempo promedio de cierre" value={ind.tiempoPromedioCierre != null ? `${ind.tiempoPromedioCierre} d` : '—'} />
        <Kpi label="Pendientes" value={ind.porEstado.pendiente} color="#5F5E5A" />
        <Kpi label="En proceso" value={ind.porEstado.en_proceso} color="#854F0B" />
        <Kpi label="Vencidos" value={ind.porEstado.vencido} color="#A32D2D" />
        <Kpi label="Pendientes de validación SST" value={ind.pendientesValidacion} color="#185FA5" />
        <Kpi label="Abiertos sin evidencia" value={ind.sinEvidencia} color="#854F0B" />
        <Kpi label="Hallazgos reincidentes" value={ind.reincidentes} color="#534AB7" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Barras titulo="Por nivel de riesgo (GTC-45)" datos={ind.porNivel}
          color={(k) => ({ I: PRIORIDAD_COLOR.critica, II: PRIORIDAD_COLOR.alta, III: PRIORIDAD_COLOR.media, IV: PRIORIDAD_COLOR.baja } as Record<string, string>)[k]}
          etiqueta={(k) => `Nivel ${k} · ${PRIORIDAD_LABEL[({ I: 'critica', II: 'alta', III: 'media', IV: 'baja' } as Record<string, Prioridad>)[k]]}`} />
        <Barras titulo="Por obra" datos={ind.porObra} color="#0C447C" />
        <Barras titulo="Por responsable" datos={ind.porResponsable} color="#534AB7" />
        <Barras titulo="Por factor de riesgo" datos={ind.porFactor} color="#854F0B" etiqueta={factorLabel} />
      </div>

      <div className="bg-white border border-[#E3E1D9] rounded-xl p-3.5 overflow-x-auto">
        <div className="text-[11px] font-semibold text-[#5F5E5A] uppercase tracking-wide mb-2">Cumplimiento por responsable</div>
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[#5F5E5A]"><th className="py-1">Responsable</th><th>Total</th><th>Abiertos</th><th>Vencidos</th><th>Cerrados</th><th>%</th></tr></thead>
          <tbody>
            {ind.responsablesDetalle.map((x) => (
              <tr key={x.nombre} className="border-t border-[#F1EFE8]">
                <td className="py-1.5">{x.nombre}</td><td>{x.total}</td><td>{x.abiertos}</td>
                <td className={x.vencidos ? 'text-[#A32D2D] font-semibold' : ''}>{x.vencidos}</td><td>{x.cerrados}</td>
                <td>{Math.round((x.cerrados / x.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
