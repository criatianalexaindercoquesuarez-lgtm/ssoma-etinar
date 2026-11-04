'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, SectionTitle, inputCls, btnPrimary } from '@/components/ui';

export default function CuentaPage() {
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [msg, setMsg] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (clave.length < 8) { setMsg('❌ La contraseña debe tener al menos 8 caracteres'); return; }
    if (clave !== repetir) { setMsg('❌ Las contraseñas no coinciden'); return; }
    setGuardando(true);
    const { error } = await createClient().auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) { setMsg('❌ ' + error.message); return; }
    setClave(''); setRepetir('');
    setMsg('✅ Contraseña actualizada. Úsela la próxima vez que ingrese.');
  }

  return (
    <div className="max-w-md mx-auto space-y-3">
      <h2 className="text-base font-semibold">Mi cuenta</h2>
      <Card>
        <SectionTitle>Cambiar contraseña</SectionTitle>
        <form onSubmit={guardar} className="space-y-2">
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Nueva contraseña (mín. 8 caracteres)" className={inputCls} autoComplete="new-password" />
          <input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} placeholder="Repetir contraseña" className={inputCls} autoComplete="new-password" />
          <button disabled={guardando} className={`${btnPrimary} w-full`}>{guardando ? 'Guardando...' : 'Guardar contraseña'}</button>
        </form>
        {msg && <p className="text-sm mt-2">{msg}</p>}
      </Card>
    </div>
  );
}
