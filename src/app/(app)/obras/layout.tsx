import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user?.id || '').single();
  if (!p || !['admin', 'coordinador_sst', 'director'].includes(p.rol)) redirect('/dashboard');
  return <>{children}</>;
}
