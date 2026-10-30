import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtFechaHora } from '@/lib/types';
import MarcarLeidas from './MarcarLeidas';

export const dynamic = 'force-dynamic';

export default async function NotificacionesPage({ searchParams }: { searchParams: { ver?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const verEnvios = searchParams.ver === 'envios';

  let q = supabase.from('notificaciones')
    .select('*, hallazgos(codigo), dest:perfiles!notificaciones_destinatario_id_fkey(nombre)')
    .order('creado_en', { ascending: false }).limit(100);
  q = verEnvios ? q.neq('canal', 'sistema') : q.eq('canal', 'sistema').eq('destinatario_id', user!.id);
  const { data: notifs } = await q;
  const sinLeer = (notifs || []).filter((n) => !n.leida).length;

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Notificaciones</h2>
        {!verEnvios && sinLeer > 0 && <MarcarLeidas />}
      </div>
      <div className="flex gap-2 text-xs">
        <Link href="/notificaciones" className={`px-3 py-1.5 rounded-lg ${!verEnvios ? 'bg-[#185FA5] text-white' : 'bg-[#F1EFE8]'}`}>Mi bandeja</Link>
        <Link href="/notificaciones?ver=envios" className={`px-3 py-1.5 rounded-lg ${verEnvios ? 'bg-[#185FA5] text-white' : 'bg-[#F1EFE8]'}`}>Registro de correos enviados</Link>
      </div>
      {(!notifs || notifs.length === 0) && <p className="text-sm text-[#5F5E5A] text-center py-10">Sin notificaciones.</p>}
      <div className="space-y-2">
        {(notifs || []).map((n) => {
          const err = String(n.estado).startsWith('error');
          return (
            <Link key={n.id} href={n.hallazgo_id ? `/hallazgos/${n.hallazgo_id}` : '#'}
              className={`block bg-white border rounded-xl p-3 ${!verEnvios && !n.leida ? 'border-[#185FA5] border-l-4' : 'border-[#E3E1D9]'}`}>
              <div className="flex justify-between gap-2 text-[11px] text-[#5F5E5A]">
                <span>{n.canal === 'email' ? '✉️ Correo' : n.canal === 'whatsapp' ? '💬 WhatsApp' : '🔔'} · {n.hallazgos?.codigo}</span>
                <span>{fmtFechaHora(n.creado_en)}</span>
              </div>
              <div className="text-sm font-semibold">{n.asunto || n.evento || 'Notificación'}</div>
              {verEnvios
                ? <div className={`text-xs ${err ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}`}>Para: {n.dest?.nombre || n.destinatario_email} · {err ? n.estado : 'Enviado'}</div>
                : <div className="text-xs text-[#5F5E5A] whitespace-pre-line line-clamp-4">{n.cuerpo}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
