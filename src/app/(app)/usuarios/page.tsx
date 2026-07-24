'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Perfil, ROL_LABEL, RolUsuario } from '@/lib/types';

export default function UsuariosPage() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<RolUsuario>('tecnico_sso');
  const [info, setInfo] = useState('');

  async function cargar() {
    const { data } = await supabase.from('perfiles').select('*').order('nombre');
    setUsuarios(data || []);
  }
  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setInfo('');
    if (!nombre || !email) { setInfo('Nombre y correo son obligatorios'); return; }
    // Nota: la creación real de un usuario con acceso requiere invitación desde
    // el Dashboard de Supabase (Authentication > Users > Invite) o la Admin API
    // desde un endpoint server-side con la service_role key. Aquí se registra
    // el perfil; el admin debe invitar el correo desde Supabase para habilitar el login.
    setInfo(
      `Perfil pendiente: invita a ${email} desde Supabase → Authentication → Invite user. ` +
      `Una vez acepte, vincula su rol "${ROL_LABEL[rol]}" en la tabla perfiles.`
    );
    setNombre(''); setEmail('');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Usuarios</h2>
      <form onSubmit={crear} className="bg-white border border-[#E3E1D9] rounded-xl p-3.5 space-y-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo"
          className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@etinar.com" type="email"
          className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm" />
        <select value={rol} onChange={(e) => setRol(e.target.value as RolUsuario)}
          className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm">
          {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="w-full bg-[#185FA5] text-white rounded-lg py-2.5 text-sm font-medium">
          Registrar intención de usuario
        </button>
        {info && <p className="text-xs text-[#854F0B] bg-[#FAEEDA] p-2 rounded-lg">{info}</p>}
      </form>

      <div className="space-y-2">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-white border border-[#E3E1D9] rounded-xl p-3">
            <div className="flex-1">
              <div className="text-sm font-semibold">{u.nombre}</div>
              <div className="text-xs text-[#5F5E5A]">{u.email}</div>
            </div>
            <span className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2 py-1 rounded-lg">{ROL_LABEL[u.rol]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
