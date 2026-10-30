import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notificarEvento, appUrl } from '@/lib/notificaciones';
import { calcularIndicadores, hoyEC, rangoPeriodo, contarInspecciones, obtenerMatriz } from '@/lib/matriz';
import type { HallazgoVista } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Control automático de plazos. Lo invoca a diario la función programada de Netlify
 * (netlify/functions/plazos-diarios.mts) con el encabezado x-cron-secret.
 *  - Fecha límite próxima (≤ PLAZO_AVISO_DIAS días): aviso una vez.
 *  - Vencido: aviso el primer día y recordatorio cada 3 días.
 *  - ?resumen=1: envía además el resumen semanal a Coordinadores SST.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });

  const avisoDias = Number(process.env.PLAZO_AVISO_DIAS || 2);
  const hoy = hoyEC();
  const { data } = await db.from('v_hallazgos').select('*').in('estado', ['pendiente', 'en_proceso']);
  const hs = (data || []) as HallazgoVista[];
  const log: { codigo: string; evento: string; enviados: number }[] = [];

  for (const h of hs) {
    const restantes = Math.round((new Date(h.fecha_limite + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / 86400000);
    if (restantes < 0) {
      const tramo = Math.floor((-restantes - 1) / 3);
      const r = await notificarEvento(db, h.id, 'vencido', {
        clave: `vencido:${h.fecha_limite}:${tramo}`,
        extra: `Vencido hace ${-restantes} día(s).`,
      });
      if (r.length) log.push({ codigo: h.codigo, evento: 'vencido', enviados: r.length });
    } else if (restantes <= avisoDias) {
      const r = await notificarEvento(db, h.id, 'plazo_proximo', {
        clave: `plazo_proximo:${h.fecha_limite}`,
        extra: restantes === 0 ? 'La fecha límite es HOY.' : `Quedan ${restantes} día(s).`,
      });
      if (r.length) log.push({ codigo: h.codigo, evento: 'plazo_proximo', enviados: r.length });
    }
  }

  let resumen = null;
  if (req.nextUrl.searchParams.get('resumen')) {
    const ayer = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    const r = rangoPeriodo('semana', ayer);
    const ind = calcularIndicadores(await obtenerMatriz(db, { desde: r.desde, hasta: r.hasta }), await contarInspecciones(db, { desde: r.desde, hasta: r.hasta }));
    const { data: sst } = await db.from('perfiles').select('email').in('rol', ['coordinador_sst', 'admin']).not('email', 'is', null);
    const texto = `Resumen semanal SST ETINAR — ${r.etiqueta}\n\nInspecciones: ${ind.totalInspecciones}\nHallazgos: ${ind.totalHallazgos}\nCerrados: ${ind.cerrados} (${ind.pctCumplimiento}%)\nVencidos: ${ind.porEstado.vencido}\nEn verificación: ${ind.pendientesValidacion}\nTiempo promedio de cierre: ${ind.tiempoPromedioCierre ?? '—'} días\nReincidentes: ${ind.reincidentes}\n\nReporte completo: ${appUrl()}/reportes?periodo=semana&fecha=${r.desde}`;
    resumen = { destinatarios: (sst || []).length, texto };
    const key = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
    for (const s of sst || []) {
      if (!key || !s.email) break;
      const from = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'no-reply@etinar.com';
      if (process.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `SST ETINAR <${from}>`, to: [s.email], subject: `[SST ETINAR] Resumen semanal — ${r.etiqueta}`, text: texto }) }).catch(() => {});
      } else {
        await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ personalizations: [{ to: [{ email: s.email }] }], from: { email: from, name: 'SST ETINAR' }, subject: `[SST ETINAR] Resumen semanal — ${r.etiqueta}`, content: [{ type: 'text/plain', value: texto }] }) }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ hoy, revisados: hs.length, notificados: log, resumen });
}
