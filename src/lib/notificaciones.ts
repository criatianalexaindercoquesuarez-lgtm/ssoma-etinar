import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HallazgoVista } from './types';
import { ESTADO_LABEL, PRIORIDAD_LABEL, fmtFecha } from './types';

/**
 * Servicio único de notificaciones (reutilizable por cualquier modalidad de inspección).
 * Canales: 'sistema' (bandeja interna, siempre), 'email' (SendGrid o Resend) y
 * 'whatsapp' (Twilio, solo si NOTIF_WHATSAPP=on).
 */
export type EventoNotificacion =
  | 'registrado' | 'asignado' | 'plazo_proximo' | 'vencido'
  | 'evidencia_cargada' | 'cierre_aprobado' | 'cierre_rechazado' | 'recordatorio';

const EVENTO_TITULO: Record<EventoNotificacion, string> = {
  registrado: 'Nuevo hallazgo registrado',
  asignado: 'Se le asignó una medida correctiva',
  plazo_proximo: 'La fecha límite se aproxima',
  vencido: 'Hallazgo VENCIDO',
  evidencia_cargada: 'Evidencia cargada para revisión SST',
  cierre_aprobado: 'Cierre APROBADO por SST',
  cierre_rechazado: 'Cierre RECHAZADO por SST',
  recordatorio: 'Recordatorio de hallazgo pendiente',
};

interface Destinatario { id: string; nombre: string; email: string | null; telefono: string | null; motivo: string }

export function appUrl() {
  return (process.env.APP_URL || process.env.URL || 'https://ssoma-etinar.netlify.app').replace(/\/$/, '');
}

/** Decide quién recibe cada evento: responsable y "implicados". */
async function resolverDestinatarios(db: SupabaseClient, h: HallazgoVista, evento: EventoNotificacion): Promise<Destinatario[]> {
  const ids = new Map<string, string>();
  const add = (id: string | null | undefined, motivo: string) => { if (id && !ids.has(id)) ids.set(id, motivo); };

  switch (evento) {
    case 'registrado':
    case 'asignado':
      add(h.responsable_id, 'Responsable de ejecutar');
      add(h.verificador_id, 'Responsable de verificar');
      add(h.creado_por, 'Inspector');
      break;
    case 'plazo_proximo':
    case 'recordatorio':
      add(h.responsable_id, 'Responsable de ejecutar');
      add(h.verificador_id, 'Responsable de verificar');
      break;
    case 'vencido':
      add(h.responsable_id, 'Responsable de ejecutar');
      add(h.verificador_id, 'Responsable de verificar');
      add(h.creado_por, 'Inspector');
      break;
    case 'evidencia_cargada':
      add(h.verificador_id, 'Responsable de verificar');
      add(h.creado_por, 'Inspector');
      break;
    case 'cierre_aprobado':
    case 'cierre_rechazado':
      add(h.responsable_id, 'Responsable de ejecutar');
      add(h.creado_por, 'Inspector');
      break;
  }

  // Implicados de la obra: Jefe de Obra / Residente de esa obra y Coordinadores SST
  // en eventos críticos (riesgo I-II, vencimientos, evidencia sin verificador asignado).
  const escalar = h.prioridad === 'critica' || h.prioridad === 'alta' || evento === 'vencido'
    || (evento === 'evidencia_cargada' && !h.verificador_id);
  if (escalar || evento === 'registrado') {
    const { data: obra } = await db.from('perfiles').select('id,rol').eq('proyecto_id', h.proyecto_id).in('rol', ['jefe_obra']);
    (obra || []).forEach((p) => add(p.id, 'Jefe de Obra'));
  }
  if (escalar) {
    const { data: sst } = await db.from('perfiles').select('id').eq('rol', 'coordinador_sst').eq('activo', true);
    (sst || []).forEach((p) => add(p.id, 'Coordinador SST'));
  }

  if (ids.size === 0) return [];
  const { data: perfiles } = await db.from('perfiles').select('id,nombre,email,telefono').in('id', Array.from(ids.keys()));
  return (perfiles || []).map((p) => ({ ...p, motivo: ids.get(p.id)! }));
}

function construirMensaje(h: HallazgoVista, evento: EventoNotificacion, extra?: string) {
  const titulo = EVENTO_TITULO[evento];
  const asunto = `[SST ETINAR] ${titulo} · ${h.codigo} · ${h.obra_nombre}`;
  const nivel = h.nivel_riesgo ? `Nivel ${h.nivel_riesgo} (NR ${h.nr})` : '—';
  const prioridad = h.prioridad ? PRIORIDAD_LABEL[h.prioridad] : '—';
  const link = `${appUrl()}/hallazgos/${h.id}`;
  const filas: [string, string][] = [
    ['Obra', `${h.obra_nombre}${h.obra_codigo ? ` (${h.obra_codigo})` : ''}`],
    ['Hallazgo', h.codigo],
    ['Ubicación', [h.area, h.ubicacion, h.nivel, h.frente].filter(Boolean).join(' · ')],
    ['Condición observada', h.descripcion],
    ['Nivel de riesgo', `${nivel} · Prioridad ${prioridad}`],
    ['Medida correctiva', h.accion_correctiva],
    ['Responsable', h.responsable_nombre || '—'],
    ['Fecha máxima de cumplimiento', fmtFecha(h.fecha_limite)],
    ['Estado', ESTADO_LABEL[h.estado_efectivo] || h.estado],
  ];
  if (extra) filas.push(['Detalle', extra]);

  const texto = `${titulo}\n\n` + filas.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nVer y responder: ${link}`;
  const color = evento === 'vencido' || evento === 'cierre_rechazado' ? '#A32D2D'
    : evento === 'cierre_aprobado' ? '#3B6D11' : '#185FA5';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html><body style="margin:0;background:#F5F5F3;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #E3E1D9">
<tr><td style="background:#185FA5;color:#fff;padding:14px 18px"><b style="font-size:18px">ETINAR</b> · Seguridad y Salud en el Trabajo</td></tr>
<tr><td style="padding:16px 18px 6px"><div style="color:${color};font-size:17px;font-weight:bold">${esc(titulo)}</div></td></tr>
<tr><td style="padding:6px 18px 12px"><table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
${filas.map(([k, v]) => `<tr><td style="border:1px solid #eee;background:#fafafa;width:38%;font-weight:bold;color:#444">${esc(k)}</td><td style="border:1px solid #eee">${esc(v || '—')}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:4px 18px 20px"><a href="${link}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">Abrir hallazgo ${esc(h.codigo)}</a>
<a href="${appUrl()}/api/export/hallazgo/${h.id}" style="margin-left:10px;color:#185FA5">Descargar reporte PDF</a></td></tr>
<tr><td style="padding:10px 18px;font-size:11px;color:#999;border-top:1px solid #eee">Mensaje automático del Sistema de Inspecciones SST ETINAR. No responda a este correo.</td></tr>
</table></body></html>`;
  return { asunto, texto, html };
}

async function enviarEmail(to: string, asunto: string, texto: string, html: string): Promise<{ ok: boolean; detalle: string }> {
  const from = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'no-reply@etinar.com';
  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `SST ETINAR <${from}>`, to: [to], subject: asunto, text: texto, html }),
      });
      return res.ok ? { ok: true, detalle: 'Enviado' } : { ok: false, detalle: `Resend ${res.status}: ${(await res.text()).slice(0, 150)}` };
    }
    if (process.env.SENDGRID_API_KEY) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from, name: 'SST ETINAR' },
          subject: asunto,
          content: [{ type: 'text/plain', value: texto }, { type: 'text/html', value: html }],
        }),
      });
      return res.ok ? { ok: true, detalle: 'Enviado' } : { ok: false, detalle: `SendGrid ${res.status}: ${(await res.text()).slice(0, 150)}` };
    }
    return { ok: false, detalle: 'Correo no configurado (RESEND_API_KEY o SENDGRID_API_KEY)' };
  } catch {
    return { ok: false, detalle: 'Error de red al enviar el correo' };
  }
}

async function enviarWhatsapp(tel: string, texto: string): Promise<{ ok: boolean; detalle: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!sid || !process.env.TWILIO_AUTH_TOKEN) return { ok: false, detalle: 'Twilio no configurado' };
  try {
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM || '', To: `whatsapp:${tel}`, Body: texto.slice(0, 1500) }),
    });
    return res.ok ? { ok: true, detalle: 'Enviado' } : { ok: false, detalle: `Twilio ${res.status}` };
  } catch {
    return { ok: false, detalle: 'Error de red Twilio' };
  }
}

export interface ResultadoNotificacion { destinatario: string; canal: string; ok: boolean; detalle: string }

/**
 * Notifica un evento de un hallazgo. `db` debe ser el cliente admin (cron) o el del usuario.
 * `clave` evita duplicados (p. ej. 'vencido:2026-11-02'): si ya existe, no se reenvía.
 */
export async function notificarEvento(
  db: SupabaseClient,
  hallazgoId: string,
  evento: EventoNotificacion,
  opts: { actorId?: string | null; extra?: string; clave?: string } = {}
): Promise<ResultadoNotificacion[]> {
  const { data: h } = await db.from('v_hallazgos').select('*').eq('id', hallazgoId).single<HallazgoVista>();
  if (!h) return [];

  if (opts.clave) {
    const { count } = await db.from('notificaciones').select('id', { count: 'exact', head: true })
      .eq('hallazgo_id', hallazgoId).eq('clave', opts.clave);
    if ((count || 0) > 0) return [];
  }

  const destinatarios = await resolverDestinatarios(db, h, evento);
  const { asunto, texto, html } = construirMensaje(h, evento, opts.extra);
  const usarWhatsapp = process.env.NOTIF_WHATSAPP === 'on';
  const resultados: ResultadoNotificacion[] = [];
  const filas: Record<string, unknown>[] = [];
  const base = { hallazgo_id: h.id, evento, clave: opts.clave || null, asunto, actor_id: opts.actorId || null };

  for (const d of destinatarios) {
    // Bandeja interna (siempre)
    filas.push({ ...base, destinatario_id: d.id, canal: 'sistema', estado: 'entregado', cuerpo: texto, destinatario_email: d.email });

    if (d.email) {
      const r = await enviarEmail(d.email, asunto, texto, html);
      resultados.push({ destinatario: d.nombre, canal: 'email', ...r });
      filas.push({ ...base, destinatario_id: d.id, canal: 'email', destinatario_email: d.email, leida: true,
        estado: r.ok ? 'enviado' : 'error: ' + r.detalle.slice(0, 120) });
    } else {
      resultados.push({ destinatario: d.nombre, canal: 'email', ok: false, detalle: 'Sin correo registrado' });
    }
    if (usarWhatsapp && d.telefono) {
      const r = await enviarWhatsapp(d.telefono, texto);
      resultados.push({ destinatario: d.nombre, canal: 'whatsapp', ...r });
      filas.push({ ...base, destinatario_id: d.id, canal: 'whatsapp', leida: true,
        estado: r.ok ? 'enviado' : 'error: ' + r.detalle.slice(0, 120) });
    }
  }
  if (filas.length) await db.from('notificaciones').insert(filas);
  return resultados;
}
