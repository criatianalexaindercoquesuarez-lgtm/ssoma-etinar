'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/hallazgos', label: 'Hallazgos' },
  { href: '/indicadores', label: 'Indicadores' },
  { href: '/notificaciones', label: 'Alertas' },
  { href: '/usuarios', label: 'Usuarios', adminOnly: true },
];

export default function NavBar({ rol }: { rol?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E3E1D9] flex z-40">
      {ITEMS.filter((i) => !i.adminOnly || rol === 'admin' || rol === 'director').map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 text-center py-3 text-[11px] ${
            pathname.startsWith(item.href) ? 'text-[#185FA5] font-semibold' : 'text-[#9C9A92]'
          }`}
        >
          {item.label}
        </Link>
      ))}
      <button onClick={signOut} className="flex-1 text-center py-3 text-[11px] text-[#9C9A92]">
        Salir
      </button>
    </nav>
  );
}
