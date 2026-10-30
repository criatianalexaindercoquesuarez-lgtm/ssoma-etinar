'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Refresca la página cuando otro usuario cambia el hallazgo, sube evidencia o firma. */
export default function RealtimeRefresh({ hallazgoId }: { hallazgoId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`hallazgo-${hallazgoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hallazgos', filter: `id=eq.${hallazgoId}` }, () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auditoria', filter: `hallazgo_id=eq.${hallazgoId}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hallazgoId, router]);
  return null;
}
