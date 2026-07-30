import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Esta ruta corre en el servidor: las API keys de Resend/Twilio
// Configúralas en Netlify -> Site settings -> Environment variables:
// SENDGRID_API_KEY (aquí colocas tu clave de Resend re_...), SENDGRID_FROM_EMAIL (onboarding@resend.dev)

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

  // ENVÍO POR EMAIL USANDO RESEND
  if ((canal === 'email' || canal === 'ambos') && destinatario.email) {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'onboarding@resend.dev';

      if (!apiKey) {
        resultados.push({ canal: 'email', ok: false, detalle: 'SENDGRID_API_KEY no configurada' });
      } else {
        const mensajeHtml = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Notificación de Hallazgo SSOMA - Etinar</h2>
            <p><strong>Título:</strong> ${h.titulo || 'Sin título'}</p>
            <p><strong>Descripción:</strong> ${h.descripcion || 'Sin descripción'}</p>
            <p><strong>Estado:</strong> ${h.estado}</p>
            <p>Por favor revisa la plataforma para gestionar esta observación.</p>
          </div>
        `;

        const resEmail = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [destinatario.email],
            subject: `Notificación SSOMA: ${h.titulo || 'Nuevo hallazgo asignado'}`,
            html: mensajeHtml,
          }),
        });

        const resData = await resEmail.json();

        if (resEmail.ok) {
          resultados.push({ canal: 'email', ok: true, detalle: `Correo enviado con éxito a ${destinatario.email}` });
        } else {
          resultados.push({ canal: 'email', ok: false, detalle: `Resend respondió: ${JSON.stringify(resData)}` });
        }
      }
    } catch (err: any) {
      resultados.push({ canal: 'email', ok: false, detalle: `Error en servidor: ${err.message}` });
    }
  }

  return NextResponse.json({ ok: true, resultados });
}
