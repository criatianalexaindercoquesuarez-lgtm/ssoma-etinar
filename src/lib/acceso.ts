import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { esRestringido } from './types';

/** Pantallas internas de SST/supervisión: el responsable externo vuelve a "Mis observaciones". */
export async function soloPersonalInterno() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (esRestringido(p?.rol)) redirect('/dashboard');
}
