'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROL_LABEL, type Perfil, type Proyecto, type RolUsuario } from '@/lib/types';
import { Card, SectionTitle, inputCls, btnPrimary } from '@/components/ui';

const vacio = { nombre: '', email: '', rol: 'residente' as RolUsuario, cargo: '', telefono: '', empresa: '', proyecto_id: '' };
interface Credencial { nombre: string; email: string; clave: string; url: string; telefono?: string | null }

export default function UsuariosPage() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<(Perfil & { activo?: boolean })[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [f, setF] = useState(vacio);
  const [info, setInfo] = useState('');
  const [cred, setCred] = useState<Credencial | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    const { data } = await supabase.from('perfiles').select('*').order('nombre');
    setUsuarios(data || []);
    const { data: ps } = await supabase.from('proyectos').select('id,nombre,codigo').order('nombre');
    setProyectos(ps || []);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setInfo(''); setCred(null);
    const res = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setInfo('❌ ' + data.error); return; }
    setCred({ nombre: f.nombre, email: data.email, clave: data.clave, url: data.url, telefono: f.telefono });
    setF(vacio);
    cargar();
  }

  async function nuevaClave(u: Perfil) {
    if (!confirm(`¿Generar una nueva contraseña temporal para ${u.nombre}? La anterior dejará de funcionar.`)) return;
    setInfo(''); setCred(null);
    const res = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, nueva_clave: true }) });
    const data = await res.json();
    if (!res.ok) { setInfo('❌ ' + data.error); return; }
    setCred({ nombre: u.nombre, email: u.email || '', clave: data.clave, url: data.url, telefono: u.telefono });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    const res = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...cambios }) });
    if (!res.ok) setInfo('❌ ' + (await res.json()).error);
    cargar();
  }

  const mensaje = cred
    ? `Hola ${cred.nombre}, tu acceso al Sistema de Inspecciones SST de ETINAR:\n\nEnlace: ${cred.url}\nUsuario: ${cred.email}\nContraseña temporal: ${cred.clave}\n\nAl ingresar, cámbiala en "Mi cuenta" (toca tu nombre arriba).`
    : '';
  const wa = cred ? `https://wa.me/${(cred.telefono || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(mensaje)}` : '';

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h2 className="text-base font-semibold">Usuarios</h2>

      {cred && (
        <Card className="border-2 border-[#3B6D11] bg-[#F6FBF0]">
          <SectionTitle>✅ Acceso listo para {cred.nombre}</SectionTitle>
          <pre className="text-sm whitespace-pre-wrap bg-white border border-[#E3E1D9] rounded-lg p-3 font-sans">{mensaje}</pre>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => navigator.clipboard.writeText(mensaje)} className="bg-[#185FA5] text-white text-sm px-3 py-2 rounded-lg">📋 Copiar mensaje</button>
            <a href={wa} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white text-sm px-3 py-2 rounded-lg">💬 Enviar por WhatsApp</a>
            <button onClick={() => setCred(null)} className="text-sm text-[#5F5E5A] px-2">Cerrar</button>
          </div>
          <p className="text-[11px] text-[#854F0B] mt-2">Copie la contraseña ahora: por seguridad no se vuelve a mostrar. Si se pierde, use «Nueva clave».</p>
        </Card>
      )}

      <Card>
        <SectionTitle>Crear usuario</SectionTitle>
        <form onSubmit={crear} className="grid sm:grid-cols-2 gap-2">
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
          <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="Celular +5939..." className={inputCls} />
          <button disabled={enviando} className={btnPrimary}>{enviando ? 'Creando...' : 'Crear usuario'}</button>
        </form>
        {info && <p className="text-xs mt-2">{info}</p>}
        <p className="text-[11px] text-[#9C9A92] mt-2">
          Se genera una contraseña temporal para entregar al usuario. Coordinador SST, Técnico SSO y Administrador ven todas las obras;
          Residente, Jefe de Obra y Contratista ven su obra y los hallazgos que se les asignan.
        </p>
      </Card>

      <div className="space-y-2">
        {usuarios.map((u) => (
          <div key={u.id} className={`bg-white border border-[#E3E1D9] rounded-xl p-3 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center ${u.activo === false ? 'opacity-50' : ''}`}>
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
            <button onClick={() => nuevaClave(u)} className="text-xs bg-[#F1EFE8] text-[#0C447C] px-2.5 py-1.5 rounded-lg whitespace-nowrap">🔑 Nueva clave</button>
          </div>
        ))}
      </div>
    </div>
  );
}
