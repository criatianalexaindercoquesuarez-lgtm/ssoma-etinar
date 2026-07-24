'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Correo o contraseña incorrectos.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] px-4">
      <div className="w-full max-w-sm bg-white border border-[#E3E1D9] rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-[#0C447C]">SSOMA · ETINAR</h1>
        <p className="text-sm text-[#5F5E5A] mb-6">Matriz de Hallazgos y Evidencias</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm"
              placeholder="usuario@etinar.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-[#A32D2D]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#185FA5] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-xs text-[#9C9A92] mt-4">
          Los usuarios son creados por un administrador desde el módulo de Usuarios.
        </p>
      </div>
    </div>
  );
}
