import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: hallazgos } = await supabase
    .from('hallazgos')
    .select('*')
    .eq('eliminado', false)
    .order('creado_en', { ascending: false });

  const hs = hallazgos || [];
  const total = hs.length;
  const abiertos = hs.filter((h) => h.estado === 'abierto').length;
  const enProceso = hs.filter((h) => h.estado === 'en_proceso').length;
  const cerrados = hs.filter((h) => h.estado === 'cerrado').length;

  const activos = hs
    .filter((h) => h.estado !== 'cerrado')
    .sort((a, b) => {
      const order: Record<string, number> = { critico: 0, moderado: 1, bajo: 2 };
      return order[a.criticidad] - order[b.criticidad];
    })
    .slice(0, 8);

  const criticidadColor: Record<string, string> = {
    critico: 'border-l-[#E24B4A]',
    moderado: 'border-l-[#EF9F27]',
    bajo: 'border-l-[#639922]',
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Metric label="Total hallazgos" value={total} color="text-[#0C447C]" />
        <Metric label="Abiertos" value={abiertos} color="text-[#A32D2D]" />
        <Metric label="En proceso" value={enProceso} color="text-[#854F0B]" />
        <Metric label="Cerrados" value={cerrados} color="text-[#3B6D11]" />
      </div>

      <h2 className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wide mt-5 mb-2">
        Hallazgos activos
      </h2>
      {activos.length === 0 && (
        <p className="text-sm text-[#5F5E5A] text-center py-8">✅ No hay hallazgos activos</p>
      )}
      <div className="space-y-2">
        {activos.map((h) => (
          <Link
            key={h.id}
            href={`/hallazgos/${h.id}`}
            className={`block bg-white border border-[#E3E1D9] border-l-4 ${criticidadColor[h.criticidad]} rounded-xl p-3`}
          >
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-[#185FA5]">{h.codigo}</span>
              <span className="text-[#5F5E5A]">{h.area}</span>
            </div>
            <p className="text-sm line-clamp-2">{h.descripcion}</p>
            <div className="text-[11px] text-[#5F5E5A] mt-1.5">
              Cierre: {new Date(h.fecha_limite).toLocaleDateString('es-EC')} · {h.cumplimiento}%
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-[#E3E1D9] rounded-xl p-3">
      <div className="text-[11px] text-[#5F5E5A] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
