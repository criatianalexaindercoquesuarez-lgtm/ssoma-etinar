import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Esta ruta corre en el servidor: las API keys de SendGrid/Twilio NUNCA
// se exponen al navegador porque no llevan el prefijo NEXT_PUBLIC_.
// Configúralas en Netlify -> Site settings -> Environment variables:
//   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM

export async function POST(req: NextRequest) {
  const { hallazgoId, canal } = await req.json(); // canal: 'email' | 'whatsapp' | 'ambos'

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: h } = await supabase.from('hallazgos').select('*').eq('id', hallazgoId).single();
  if (!h) return NextResponse.json({ error: 'Hallazgo no encontrado' }, { status: 404 });

  const { data: destinatario } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', h.responsable_id)
    .single();
  if (!destinatario) return NextResponse.json({ error: 'Responsable no encontrado' }, { status: 404 });

  const resultados: { canal: string; ok: boolean; detalle: string }[] = [];
  const mensaje = `SSOMA ETINAR: El hallazgo ${h.codigo} (${h.area}) requiere tu atención. Criticidad: ${h.criticidad}. Fecha límite: ${h.fecha_limite}.`;

  const enviarEmail = canal === 'email' || canal === 'ambos';
  const enviarWhatsapp = canal === 'whatsapp' || canal === 'ambos';

  if (enviarEmail) {
    if (!destinatario.email) {
      resultados.push({ canal: 'email', ok: false, detalle: 'El responsable no tiene correo registrado' });
    } else if (!process.env.SENDGRID_API_KEY) {
      resultados.push({ canal: 'email', ok: false, detalle: 'SENDGRID_API_KEY no está configurada en el servidor' });
    } else {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: destinatario.email }] }],
            from: { email: process.env.SENDGRID_FROM_EMAIL || 'no-reply@etinar.com' },
            subject: `SSOMA · Hallazgo ${h.codigo} requiere atención`,
            content: [{ type: 'text/plain', value: mensaje }],
          }),
        });
        if (res.ok || res.status === 202) {
          resultados.push({ canal: 'email', ok: true, detalle: 'Enviado' });
        } else {
          const body = await res.text();
          resultados.push({ canal: 'email', ok: false, detalle: `SendGrid respondió ${res.status}: ${body.slice(0, 200)}` });
        }
      } catch {
        resultados.push({ canal: 'email', ok: false, detalle: 'Error de red al llamar a SendGrid' });
      }
    }
  }

  if (enviarWhatsapp) {
    if (!destinatario.telefono) {
      resultados.push({ canal: 'whatsapp', ok: false, detalle: 'El responsable no tiene teléfono registrado' });
    } else if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      resultados.push({ canal: 'whatsapp', ok: false, detalle: 'Credenciales de Twilio no configuradas en el servidor' });
    } else {
      try {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const params = new URLSearchParams({
          From: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
          To: `whatsapp:${destinatario.telefono}`,
          Body: mensaje,
        });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });
        if (res.ok) {
          resultados.push({ canal: 'whatsapp', ok: true, detalle: 'Enviado' });
        } else {
          const body = await res.text();
          resultados.push({ canal: 'whatsapp', ok: false, detalle: `Twilio respondió ${res.status}: ${body.slice(0, 200)}` });
        }
      } catch {
        resultados.push({ canal: 'whatsapp', ok: false, detalle: 'Error de red al llamar a Twilio' });
      }
    }
  }

  // Registrar cada intento en notificaciones, éxito o no, para trazabilidad real.
  for (const r of resultados) {
    await supabase.from('notificaciones').insert({
      hallazgo_id: h.id,
      destinatario_id: destinatario.id,
      canal: r.canal,
      estado: r.ok ? 'enviado' : 'error: ' + r.detalle.slice(0, 100),
    });
  }

  const algunoFallo = resultados.some((r) => !r.ok);
  return NextResponse.json({ resultados }, { status: algunoFallo ? 207 : 200 });
}
