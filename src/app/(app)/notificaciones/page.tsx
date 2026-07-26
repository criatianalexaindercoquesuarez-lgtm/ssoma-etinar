import { createClient } from '@/lib/supabase/server';

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const { data: notifs } = await supabase
    .from('notificaciones')
    .select('*, hallazgos(codigo), perfiles(nombre)')
    .order('creado_en', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Notificaciones</h2>
      {(!notifs || notifs.length === 0) && (
        <p className="text-sm text-[#5F5E5A] text-center py-10">Sin notificaciones registradas aún.</p>
      )}
      <div className="space-y-2">
        {(notifs || []).map((n: { id: string; canal: string; estado: string; creado_en: string; hallazgos: { codigo: string } | null; perfiles: { nombre: string } | null }) => {
          const esError = typeof n.estado === 'string' && n.estado.startsWith('error');
          return (
            <div key={n.id} className="bg-white border border-[#E3E1D9] rounded-xl p-3 flex gap-3">
              <div className="text-lg">{n.canal === 'whatsapp' ? '💬' : '✉️'}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{n.hallazgos?.codigo || '—'}</div>
                <div className="text-xs text-[#5F5E5A]">Para: {n.perfiles?.nombre || '—'}</div>
                {esError && <div className="text-[11px] text-[#A32D2D] mt-1">{n.estado}</div>}
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${esError ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
                  {esError ? 'Error' : 'Enviado'}
                </span>
                <div className="text-[10px] text-[#5F5E5A] mt-1">{new Date(n.creado_en).toLocaleString('es-EC')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
