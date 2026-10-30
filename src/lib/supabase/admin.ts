import 'server-only';
import { createClient as createSbClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con service_role: SOLO en el servidor (cron de plazos, invitación de usuarios,
 * registro de notificaciones). Nunca importar desde componentes 'use client'.
 * Variable en Netlify: SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_).
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
