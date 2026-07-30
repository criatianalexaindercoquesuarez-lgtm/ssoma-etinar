import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ResultadoEnvio = {
  canal: string;
  ok: boolean;
  detalle: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hallazgoId = body.hallazgoId;
    const canal = body.canal;

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

    const resultados: ResultadoEnvio[] = [];

    // ENVÍO POR EMAIL USANDO RESEND
    if ((canal === 'email' || canal === 'ambos') && destinatario.email) {
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
    }

    return NextResponse.json({ ok: true, resultados });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
