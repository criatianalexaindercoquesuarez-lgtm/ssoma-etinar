'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROL_LABEL, type Perfil, type Proyecto, type RolUsuario } from '@/lib/types';
import { Card, SectionTitle, inputCls, btnPrimary } from '@/components/ui';

const vacio = { nombre: '', email: '', rol: 'residente' as RolUsuario, cargo: '', telefono: '', empresa: '', proyecto_id: '' };

export default function UsuariosPage() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<(Perfil & { activo?: boolean })[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [f, setF] = useState(vacio);
  const [info, setInfo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    const { data } = await supabase.from('perfiles').select('*').order('nombre');
    setUsuarios(data || []);
    const { data: ps } = await supabase.from('proyectos').select('id,nombre,codigo').order('nombre');
    setProyectos(ps || []);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setInfo('');
    const res = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setInfo('❌ ' + data.error); return; }
    setInfo(`✅ Invitación enviada a ${f.email}. Recibirá un correo para crear su contraseña.`);
    setF(vacio);
    cargar();
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    const res = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...cambios }) });
    if (!res.ok) setInfo('❌ ' + (await res.json()).error);
    cargar();
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h2 className="text-base font-semibold">Usuarios</h2>
      <Card>
        <SectionTitle>Invitar usuario</SectionTitle>
        <form onSubmit={invitar} className="grid sm:grid-cols-2 gap-2">
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre completo *" className={inputCls} />
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Correo *" className={inputCls} />
          <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as RolUsuario })} className={inputCls}>
            {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} placeholder="Cargo (aparece en firmas)" className={inputCls} />
          <select value={f.proyecto_id} onChange={(e) => setF({ ...f, proyecto_id: e.target.value })} className={inputCls}>
            <option value="">Obra principal (opcional)</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} placeholder="Empresa (ETINAR o contratista)" className={inputCls} />
          <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="Teléfono +593..." className={inputCls} />
          <button disabled={enviando} className={btnPrimary}>{enviando ? 'Enviando...' : 'Enviar invitación'}</button>
        </form>
        {info && <p className="text-xs mt-2">{info}</p>}
        <p className="text-[11px] text-[#9C9A92] mt-2">Coordinador SST, Técnico SSO y Administrador ven todas las obras. Residente, Jefe de Obra y Contratista ven su obra y los hallazgos que se les asignan.</p>
      </Card>
      <div className="space-y-2">
        {usuarios.map((u) => (
          <div key={u.id} className={`bg-white border border-[#E3E1D9] rounded-xl p-3 grid sm:grid-cols-[1fr_auto_auto] gap-2 items-center ${u.activo === false ? 'opacity-50' : ''}`}>
            <div>
              <div className="text-sm font-semibold">{u.nombre}</div>
              <div className="text-xs text-[#5F5E5A]">{u.email} · {u.cargo || '—'}</div>
            </div>
            <select defaultValue={u.rol} onChange={(e) => actualizar(u.id, { rol: e.target.value })} className="text-xs border border-[#E3E1D9] rounded-lg px-2 py-1.5">
              {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select defaultValue={u.proyecto_id || ''} onChange={(e) => actualizar(u.id, { proyecto_id: e.target.value })} className="text-xs border border-[#E3E1D9] rounded-lg px-2 py-1.5">
              <option value="">Sin obra</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
