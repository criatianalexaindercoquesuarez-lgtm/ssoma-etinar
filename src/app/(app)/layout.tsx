import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NavBar from '@/components/NavBar';
import { ROL_LABEL, type RolUsuario } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  const { count: sinLeer } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true })
    .eq('destinatario_id', user.id).eq('canal', 'sistema').eq('leida', false);

  return (
    <div className="min-h-screen bg-[#F5F5F3] pb-20 text-[#222]">
      <header className="sticky top-0 z-40 bg-[#185FA5] text-white px-4 py-3 flex items-center justify-between shadow">
        <div>
          <h1 className="text-base font-semibold">ETINAR · Inspecciones SST</h1>
          <p className="text-[11px] opacity-85">
            {perfil?.nombre || user.email} · {perfil?.cargo || (perfil?.rol ? ROL_LABEL[perfil.rol as RolUsuario] : '')}
          </p>
        </div>
        <a href="/notificaciones" className="relative text-xl" aria-label="Notificaciones">
          🔔
          {!!sinLeer && (
            <span className="absolute -top-1 -right-2 bg-[#E24B4A] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
              {sinLeer > 99 ? '99+' : sinLeer}
            </span>
          )}
        </a>
      </header>
      <main className="max-w-5xl mx-auto p-4">{children}</main>
      <NavBar rol={perfil?.rol} />
    </div>
  );
}
