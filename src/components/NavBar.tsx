'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/inspecciones', label: 'Inspecciones', icon: '📋' },
  { href: '/hallazgos', label: 'Matriz', icon: '⚠️' },
  { href: '/reportes', label: 'Reportes', icon: '📊' },
  { href: '/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin', 'coordinador_sst', 'director'] },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E3E1D9] flex z-40 print:hidden">
      {ITEMS.filter((i) => !i.roles || (rol && i.roles.includes(rol))).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 text-center py-2 text-[10px] leading-tight ${
            pathname.startsWith(item.href) ? 'text-[#185FA5] font-semibold' : 'text-[#9C9A92]'
          }`}
        >
          <div className="text-base">{item.icon}</div>
          {item.label}
        </Link>
      ))}
      <button onClick={signOut} className="flex-1 text-center py-2 text-[10px] text-[#9C9A92] leading-tight">
        <div className="text-base">↩</div>Salir
      </button>
    </nav>
  );
}
