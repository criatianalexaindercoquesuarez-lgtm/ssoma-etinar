import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NavBar from '@/components/NavBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#F5F5F3] pb-20">
      <header className="sticky top-0 z-40 bg-[#185FA5] text-white px-4 py-3.5 flex items-center justify-between shadow">
        <div>
          <h1 className="text-base font-semibold">SSOMA · ETINAR</h1>
          <p className="text-[11px] opacity-85">{perfil?.nombre || user.email}</p>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">
          {perfil?.rol || '—'}
        </span>
      </header>
      <main className="max-w-2xl mx-auto p-4">{children}</main>
      <NavBar rol={perfil?.rol} />
    </div>
  );
}
