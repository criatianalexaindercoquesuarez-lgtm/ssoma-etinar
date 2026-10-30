// Función programada de Netlify: control diario de plazos (07:00 hora Ecuador = 12:00 UTC).
// Requiere las variables CRON_SECRET y SUPABASE_SERVICE_ROLE_KEY en Netlify.
export default async () => {
  const base = (process.env.APP_URL || process.env.URL || '').replace(/\/$/, '');
  const lunes = new Date().getUTCDay() === 1;
  const res = await fetch(`${base}/api/cron/plazos${lunes ? '?resumen=1' : ''}`, {
    headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
  });
  console.log('plazos-diarios', res.status, (await res.text()).slice(0, 500));
};

export const config = { schedule: '0 12 * * *' };
