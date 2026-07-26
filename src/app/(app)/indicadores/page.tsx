import { createClient } from '@/lib/supabase/server';
import { NORMATIVAS } from '@/lib/types';
import Link from 'next/link';

export default async function IndicadoresPage() {
  const supabase = await createClient();
  const { data: hallazgos } = await supabase.from('hallazgos').select('*').eq('eliminado', false);
  const { data: evidencias } = await supabase.from('evidencias').select('hallazgo_id').eq('eliminado', false);
  const { data: perfiles } = await supabase.from('perfiles').select('id,nombre');

  const hs = hallazgos || [];
  const total = hs.length || 1;
  const totalReal = hs.length;

  const crit = hs.filter((h) => h.criticidad === 'critico').length;
  const mod = hs.filter((h) => h.criticidad === 'moderado').length;
  const baj = hs.filter((h) => h.criticidad === 'bajo').length;

  const cerrados = hs.filter((h) => h.estado === 'cerrado').length;
  const vencidos = hs.filter(
    (h) => h.estado !== 'cerrado' && new Date(h.fecha_limite) < new Date(new Date().toDateString())
  ).length;

  const evidenciaPorHallazgo = new Set((evidencias || []).map((e) => e.hallazgo_id));
  const conEvidencia = hs.filter((h) => evidenciaPorHallazgo.has(h.id)).length;
  const conNormativa = hs.filter((h) => h.normativa && h.normativa.length > 0).length;

  const porArea: Record<string, number> = {};
  hs.forEach((h) => { porArea[h.area] = (porArea[h.area] || 0) + 1; });
  const maxArea = Math.max(1, ...Object.values(porArea));

  const porResp: Record<string, number> = {};
  hs.forEach((h) => {
    const u = perfiles?.find((p) => p.id === h.responsable_id);
    const k = u?.nombre || 'Sin asignar';
    porResp[k] = (porResp[k] || 0) + 1;
  });
  const maxResp = Math.max(1, ...Object.values(porResp));

  const porNormativa: Record<string, number> = {};
  hs.forEach((h) => (h.normativa || []).forEach((n: string) => {
    const l = NORMATIVAS.find((x) => x.id === n)?.label || n;
    porNormativa[l] = (porNormativa[l] || 0) + 1;
  }));
  const maxNorm = Math.max(1, ...Object.values(porNormativa));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Indicadores</h2>
        <Link href="/indicadores/reporte" target="_blank" className="bg-[#185FA5] text-white text-sm font-medium px-3 py-2 rounded-lg">
          ⬇ Exportar PDF
        </Link>
      </div>

      <Card title="Distribución por criticidad">
        <Bar label="Crítico" value={crit} max={total} color="#E24B4A" />
        <Bar label="Moderado" value={mod} max={total} color="#EF9F27" />
        <Bar label="Bajo" value={baj} max={total} color="#639922" />
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric label="Tasa de cierre" value={`${Math.round((cerrados / total) * 100)}%`} color="text-[#3B6D11]" />
        <Metric label="Vencidos" value={String(vencidos)} color="text-[#A32D2D]" />
        <Metric label="Con evidencia fotográfica" value={`${Math.round((conEvidencia / total) * 100)}%`} color="text-[#0C447C]" />
        <Metric label="Con base normativa" value={`${Math.round((conNormativa / total) * 100)}%`} color="text-[#0C447C]" />
      </div>

      <Card title="Hallazgos por área">
        {Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([area, n]) => (
          <Bar key={area} label={area.split('/')[0].trim()} value={n} max={maxArea} color="#185FA5" />
        ))}
        {totalReal === 0 && <Empty />}
      </Card>

      <Card title="Hallazgos por responsable">
        {Object.entries(porResp).sort((a, b) => b[1] - a[1]).map(([nombre, n]) => (
          <Bar key={nombre} label={nombre.split(' ').slice(-1)[0]} value={n} max={maxResp} color="#534AB7" />
        ))}
        {totalReal === 0 && <Empty />}
      </Card>

      <Card title="Hallazgos por base normativa">
        {Object.entries(porNormativa).sort((a, b) => b[1] - a[1]).map(([n, c]) => (
          <Bar key={n} label={n} value={c} max={maxNorm} color="#854F0B" wide />
        ))}
        {Object.keys(porNormativa).length === 0 && <Empty />}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E3E1D9] rounded-xl p-3.5">
      <div className="text-[11px] font-semibold text-[#5F5E5A] uppercase tracking-wide mb-2.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-[#E3E1D9] rounded-xl p-3">
      <div className="text-[11px] text-[#5F5E5A] mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
function Bar({ label, value, max, color, wide }: { label: string; value: number; max: number; color: string; wide?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`${wide ? 'min-w-[150px]' : 'min-w-[80px]'} text-right text-[#5F5E5A]`}>{label}</div>
      <div className="flex-1 h-2 bg-[#F1EFE8] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <div className="min-w-[18px] font-semibold">{value}</div>
    </div>
  );
}
function Empty() {
  return <p className="text-xs text-[#5F5E5A] text-center py-3">Sin datos aún</p>;
}
