'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MarcarLeidas() {
  const router = useRouter();
  async function marcar() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notificaciones').update({ leida: true }).eq('destinatario_id', user!.id).eq('leida', false);
    router.refresh();
  }
  return <button onClick={marcar} className="text-xs text-[#185FA5]">Marcar todas como leídas</button>;
}
