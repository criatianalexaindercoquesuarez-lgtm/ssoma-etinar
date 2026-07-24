import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ESTADO_LABEL: Record<string, string> = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  cerrado: 'Cerrado',
};

export default async function HallazgosPage() {
  const supabase = await createClient();
  const { data: hallazgos } = await supabase
    .from('hallazgos')
    .select('*')
    .eq('eliminado', false)
    .order('creado_en', { ascending: false });

  const hs = hallazgos || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Hallazgos</h2>
        <Link
          href="/hallazgos/nuevo"
          className="bg-[#185FA5] text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nuevo
        </Link>
      </div>
      {hs.length === 0 && (
        <p className="text-sm text-[#5F5E5A] text-center py-10">Aún no hay hallazgos registrados.</p>
      )}
      <div className="space-y-2">
        {hs.map((h) => (
          <Link
            key={h.id}
            href={`/hallazgos/${h.id}`}
            className="block bg-white border border-[#E3E1D9] rounded-xl p-3"
          >
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-[#185FA5]">{h.codigo}</span>
              <span className="text-[#5F5E5A]">{h.area}</span>
            </div>
            <p className="text-sm line-clamp-2 mb-1.5">{h.descripcion}</p>
            <div className="flex justify-between items-center text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-[#F1EFE8] text-[#5F5E5A]">
                {ESTADO_LABEL[h.estado]}
              </span>
              <span>{h.cumplimiento}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
