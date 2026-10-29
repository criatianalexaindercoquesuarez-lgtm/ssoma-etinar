import type { Filtros } from '@/lib/matriz';
import { ESTADO_LABEL } from '@/lib/types';

export default function FiltrosMatriz({ f, proyectos, responsables, extra }: {
  f: Filtros; proyectos: { id: string; nombre: string }[]; responsables: { id: string; nombre: string }[]; extra?: React.ReactNode;
}) {
  const sel = 'border border-[#E3E1D9] rounded-lg px-2 py-2 text-sm bg-white w-full';
  return (
    <form className="bg-white border border-[#E3E1D9] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {extra}
      <label className="col-span-2 sm:col-span-1">Obra
        <select name="obra" defaultValue={f.obra || ''} className={sel}>
          <option value="">Todas</option>
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>
      <label>Desde<input type="date" name="desde" defaultValue={f.desde || ''} className={sel} /></label>
      <label>Hasta<input type="date" name="hasta" defaultValue={f.hasta || ''} className={sel} /></label>
      <label className="col-span-2 sm:col-span-1">Responsable
        <select name="responsable" defaultValue={f.responsable || ''} className={sel}>
          <option value="">Todos</option>
          {responsables.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>
      <label>Nivel de riesgo
        <select name="nivel" defaultValue={f.nivel || ''} className={sel}>
          <option value="">Todos</option>
          <option value="I">I · Crítica</option><option value="II">II · Alta</option>
          <option value="III">III · Media</option><option value="IV">IV · Baja</option>
        </select>
      </label>
      <label>Estado
        <select name="estado" defaultValue={f.estado || ''} className={sel}>
          <option value="">Todos</option>
          {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {f.inspeccion && <input type="hidden" name="inspeccion" value={f.inspeccion} />}
      <div className="col-span-2 sm:col-span-2 flex gap-2 items-end">
        <button className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm flex-1">Aplicar filtros</button>
        <a href="?" className="bg-[#F1EFE8] text-[#5F5E5A] rounded-lg px-3 py-2 text-sm">Limpiar</a>
      </div>
    </form>
  );
}
