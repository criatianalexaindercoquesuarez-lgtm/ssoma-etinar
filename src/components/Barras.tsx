export function Barras({ titulo, datos, color = '#185FA5', etiqueta }: {
  titulo: string; datos: [string, number][]; color?: string | ((k: string) => string); etiqueta?: (k: string) => string;
}) {
  const max = Math.max(1, ...datos.map((d) => d[1]));
  return (
    <div className="bg-white border border-[#E3E1D9] rounded-xl p-3.5">
      <div className="text-[11px] font-semibold text-[#5F5E5A] uppercase tracking-wide mb-2.5">{titulo}</div>
      {datos.length === 0 && <p className="text-xs text-[#9C9A92] text-center py-2">Sin datos</p>}
      <div className="space-y-1.5">
        {datos.map(([k, n]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <div className="w-[38%] text-right text-[#5F5E5A] truncate" title={etiqueta ? etiqueta(k) : k}>{etiqueta ? etiqueta(k) : k}</div>
            <div className="flex-1 h-2.5 bg-[#F1EFE8] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: typeof color === 'function' ? color(k) : color }} />
            </div>
            <div className="w-7 font-semibold tabular-nums">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Kpi({ label, value, color = '#0C447C', sub }: { label: string; value: React.ReactNode; color?: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#E3E1D9] rounded-xl p-3">
      <div className="text-[11px] text-[#5F5E5A]">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[#9C9A92]">{sub}</div>}
    </div>
  );
}
