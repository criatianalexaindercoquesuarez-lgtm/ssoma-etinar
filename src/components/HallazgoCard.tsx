import Link from 'next/link';
import type { HallazgoVista } from '@/lib/types';
import { fmtFecha, PRIORIDAD_COLOR } from '@/lib/types';
import { EstadoBadge, PrioridadBadge } from './ui';

export default function HallazgoCard({ h, mostrarObra = true }: { h: HallazgoVista; mostrarObra?: boolean }) {
  return (
    <Link
      href={`/hallazgos/${h.id}`}
      className="block bg-white border border-[#E3E1D9] border-l-4 rounded-xl p-3"
      style={{ borderLeftColor: h.prioridad ? PRIORIDAD_COLOR[h.prioridad] : '#E3E1D9' }}
    >
      <div className="flex justify-between items-center text-xs mb-1 gap-2">
        <span className="font-bold text-[#185FA5]">{h.codigo}</span>
        <div className="flex gap-1 flex-wrap justify-end">
          <PrioridadBadge prioridad={h.prioridad} nivel={h.nivel_riesgo} />
          <EstadoBadge estado={h.estado_efectivo} />
        </div>
      </div>
      {mostrarObra && <p className="text-[11px] text-[#0C447C] font-semibold">🏗️ {h.obra_nombre} · {h.area}</p>}
      <p className="text-sm line-clamp-2 my-1">{h.descripcion}</p>
      <div className="flex justify-between text-[11px] text-[#5F5E5A]">
        <span>👷 {h.responsable_nombre || 'Sin asignar'}</span>
        <span className={h.estado_efectivo === 'vencido' ? 'text-[#A32D2D] font-semibold' : ''}>
          Límite: {fmtFecha(h.fecha_limite)}{h.reincidente_de ? ' · ♻ Reincidente' : ''}
        </span>
      </div>
    </Link>
  );
}
