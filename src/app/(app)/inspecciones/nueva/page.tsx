'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AREAS, type Perfil, type Proyecto } from '@/lib/types';
import { MODALIDADES } from '@/lib/modalidades';
import { Card, Field, SectionTitle, inputCls, btnPrimary, btnSecondary } from '@/components/ui';

function ahoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NuevaInspeccionPage() {
  const supabase = createClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [f, setF] = useState({
    proyecto_id: '', modalidad: 'no_planeada', fecha_hora: ahoraLocal(), inspector_id: '',
    area: '', ubicacion: '', nivel: '', frente: '', contratista: '', observaciones: '',
  });
  const [obraNueva, setObraNueva] = useState({ nombre: '', codigo: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ps } = await supabase.from('proyectos').select('id,nombre,codigo').eq('activo', true).order('nombre');
      const { data: us } = await supabase.from('perfiles').select('*').eq('activo', true).order('nombre');
      setProyectos(ps || []);
      setUsuarios(us || []);
      const yo = (us || []).find((u) => u.id === user?.id);
      setF((p) => ({ ...p, inspector_id: user?.id || '', proyecto_id: yo?.proyecto_id || ps?.[0]?.id || '' }));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crearObra() {
    if (!obraNueva.nombre.trim() || !obraNueva.codigo.trim()) { setError('Indique nombre y código de la obra'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('proyectos')
      .insert({ nombre: obraNueva.nombre.trim(), codigo: obraNueva.codigo.trim().toUpperCase(), creado_por: user?.id })
      .select('id,nombre,codigo').single();
    if (error || !data) { setError('No se pudo crear la obra: ' + error?.message); return; }
    setProyectos((p) => [...p, data]);
    set('proyecto_id', data.id);
    setObraNueva({ nombre: '', codigo: '' });
    setError('');
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.proyecto_id || !f.fecha_hora || !f.inspector_id || !f.area) { setError('Complete obra, fecha, inspector y área'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('inspecciones').insert({
      ...f, fecha_hora: new Date(f.fecha_hora).toISOString(), creado_por: user?.id,
    }).select('id').single();
    setSaving(false);
    if (error || !data) { setError('Error al guardar: ' + error?.message); return; }
    router.push(`/inspecciones/${data.id}`);
  }

  return (
    <form onSubmit={guardar} className="space-y-3 max-w-2xl mx-auto">
      <h2 className="text-base font-semibold">Nueva inspección</h2>
      <Card className="space-y-3">
        <SectionTitle n="A">Datos generales de la inspección</SectionTitle>
        <Field label="Obra / proyecto *">
          <select value={f.proyecto_id} onChange={(e) => set('proyecto_id', e.target.value)} className={inputCls}>
            {proyectos.length === 0 && <option value="">Sin obras registradas</option>}
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} — ` : ''}{p.nombre}</option>)}
          </select>
          <div className="flex gap-1.5 mt-1.5">
            <input value={obraNueva.codigo} onChange={(e) => setObraNueva({ ...obraNueva, codigo: e.target.value })} placeholder="Código (ej. EDN)" className={`${inputCls} w-28`} />
            <input value={obraNueva.nombre} onChange={(e) => setObraNueva({ ...obraNueva, nombre: e.target.value })} placeholder="+ Nombre de obra nueva" className={`${inputCls} flex-1`} />
            <button type="button" onClick={crearObra} className={btnSecondary}>Agregar</button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modalidad">
            <select value={f.modalidad} onChange={(e) => set('modalidad', e.target.value)} className={inputCls}>
              {MODALIDADES.filter((m) => m.activa).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Fecha y hora *">
            <input type="datetime-local" value={f.fecha_hora} onChange={(e) => set('fecha_hora', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Inspector responsable *">
          <select value={f.inspector_id} onChange={(e) => set('inspector_id', e.target.value)} className={inputCls}>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.cargo ? ` — ${u.cargo}` : ''}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área *">
            <select value={f.area} onChange={(e) => set('area', e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Ubicación"><input value={f.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Bloque B, eje 4-5" className={inputCls} /></Field>
          <Field label="Nivel"><input value={f.nivel} onChange={(e) => set('nivel', e.target.value)} placeholder="Losa N+6.40" className={inputCls} /></Field>
          <Field label="Frente de trabajo"><input value={f.frente} onChange={(e) => set('frente', e.target.value)} placeholder="Encofrado" className={inputCls} /></Field>
        </div>
        <Field label="Empresa contratista involucrada (si aplica)">
          <input value={f.contratista} onChange={(e) => set('contratista', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Observaciones generales">
          <textarea value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)} className={`${inputCls} min-h-16`} />
        </Field>
      </Card>
      {error && <p className="text-sm text-[#A32D2D]">{error}</p>}
      <button disabled={saving} className={`${btnPrimary} w-full`}>{saving ? 'Guardando...' : 'Crear inspección y registrar hallazgos'}</button>
    </form>
  );
}
