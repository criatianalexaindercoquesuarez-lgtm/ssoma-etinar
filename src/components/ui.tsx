import type { EstadoEfectivo, Prioridad, NivelRiesgo } from '@/lib/types';
import { ESTADO_COLOR, ESTADO_LABEL, PRIORIDAD_COLOR, PRIORIDAD_LABEL } from '@/lib/types';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-[#E3E1D9] rounded-xl p-3.5 ${className}`}>{children}</div>;
}
export function SectionTitle({ children, n }: { children: React.ReactNode; n?: string }) {
  return (
    <div className="text-[11px] font-semibold text-[#185FA5] uppercase tracking-wide mb-2 flex items-center gap-1.5">
      {n && <span className="bg-[#185FA5] text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[9px]">{n}</span>}
      {children}
    </div>
  );
}
export function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-[#F1EFE8] last:border-0 text-sm">
      <div className="text-[#5F5E5A] min-w-[130px] max-w-[130px] text-xs pt-0.5">{label}</div>
      <div className="font-medium flex-1 whitespace-pre-wrap break-words">{value === null || value === undefined || value === '' ? '—' : value}</div>
    </div>
  );
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#9C9A92] mt-1">{hint}</p>}
    </div>
  );
}
export function EstadoBadge({ estado }: { estado: EstadoEfectivo }) {
  const c = ESTADO_COLOR[estado] || ESTADO_COLOR.pendiente;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>{ESTADO_LABEL[estado] || estado}</span>;
}
export function PrioridadBadge({ prioridad, nivel }: { prioridad?: Prioridad | null; nivel?: NivelRiesgo | null }) {
  if (!prioridad) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white whitespace-nowrap" style={{ background: PRIORIDAD_COLOR[prioridad] }}>
      {nivel ? `Nivel ${nivel} · ` : ''}{PRIORIDAD_LABEL[prioridad]}
    </span>
  );
}
export const inputCls = 'w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm bg-white';
export const btnPrimary = 'bg-[#185FA5] text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60';
export const btnSecondary = 'bg-[#F1EFE8] text-[#0C447C] rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60';
