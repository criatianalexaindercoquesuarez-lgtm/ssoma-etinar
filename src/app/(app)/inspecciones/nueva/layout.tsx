import { soloPersonalInterno } from '@/lib/acceso';

export default async function Layout({ children }: { children: React.ReactNode }) {
  await soloPersonalInterno();
  return <>{children}</>;
}
