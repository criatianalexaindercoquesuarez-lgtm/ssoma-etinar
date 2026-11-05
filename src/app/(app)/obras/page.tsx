'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, SectionTitle, inputCls, btnPrimary } from '@/components/ui';

interface Obra { id: string; nombre: string; codigo: string | null; ubicacion: string | null; activo: boolean; creado_en: string }
interface Resumen { total: number; abiertos: number; vencidos: number; usuarios: number }

const vacio = { codigo: '', nombre: '', ubicacion: '' };

export default function ObrasPage() {
  const supabase = createClient();
  const [obras, setObras] = useState<Obra[]>([]);
  const [resumen, setResumen] = useState<Record<string, Resumen>>({});
  const [f, setF] = useState(vacio);
  const [editando, setEditando] = useState<string | null>(null);
  const [verCerradas, setVerCerradas] = useState(false);
  const [msg, setMsg] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const [{ data: os }, { data: hs }, { data: us }] = await Promise.all([
      supabase.from('proyectos').select('id,nombre,codigo,ubicacion,activo,creado_en').order('nombre'),
      supabase.from('v_hallazgos').select('proyecto_id,estado,estado_efectivo'),
      supabase.from('perfiles').select('proyecto_id'),
    ]);
    setObras(os || []);
    const r: Record<string, Resumen> = {};
    const get = (id: string) => (r[id] = r[id] || { total: 0, abiertos: 0, vencidos: 0, usuarios: 0 });
    (hs || []).forEach((h) => {
      const x = get(h.proyecto_id); x.total++;
      if (h.estado !== 'cerrado') x.abiertos++;
      if (h.estado_efectivo === 'vencido') x.vencidos++;
    });
    (us || []).forEach((u) => { if (u.proyecto_id) get(u.proyecto_id).usuarios++; });
    setResumen(r);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const codigo = f.codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!codigo || codigo.length > 8) { setMsg('❌ El código es obligatorio: letras o números, máximo 8 (ej. HSD, EDN2)'); return; }
    if (!f.nombre.trim()) { setMsg('❌ El nombre de la obra es obligatorio'); return; }
    setGuardando(true);
    const fila = { codigo, nombre: f.nombre.trim(), ubicacion: f.ubicacion.trim() || null };
    let error;
    if (editando) {
      ({ error } = await supabase.from('proyectos').update(fila).eq('id', editando));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from('proyectos').insert({ ...fila, activo: true, creado_por: user?.id }));
    }
    setGuardando(false);
    if (error) {
      setMsg('❌ ' + (/duplicate|unique/i.test(error.message) ? `Ya existe una obra con el código ${codigo}` : error.message));
      return;
    }
    setMsg(editando ? '✅ Obra actualizada' : `✅ Obra ${codigo} creada. Ya aparece al registrar inspecciones.`);
    setF(vacio); setEditando(null);
    cargar();
  }

  async function cambiarEstado(o: Obra) {
    const accion = o.activo ? 'cerrar' : 'reabrir';
    if (!confirm(`¿Desea ${accion} la obra ${o.nombre}?${o.activo ? '\nNo se podrán registrar nuevas inspecciones; su historial se conserva.' : ''}`)) return;
    const { error } = await supabase.from('proyectos').update({ activo: !o.activo }).eq('id', o.id);
    if (error) setMsg('❌ ' + error.message);
    cargar();
  }

  const lista = obras.filter((o) => verCerradas || o.activo);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h2 className="text-base font-semibold">Obras</h2>
      <Card>
        <SectionTitle>{editando ? 'Editar obra' : 'Registrar obra nueva'}</SectionTitle>
        <form onSubmit={guardar} className="grid sm:grid-cols-[110px_1fr] gap-2">
          <input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} placeholder="Código *" maxLength={8} className={inputCls} />
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre de la obra *" className={inputCls} />
          <input value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} placeholder="Ubicación / dirección (ciudad, sector)" className={`${inputCls} sm:col-span-2`} />
          <div className="sm:col-span-2 flex gap-2">
            <button disabled={guardando} className={`${btnPrimary} flex-1`}>{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear obra'}</button>
            {editando && <button type="button" onClick={() => { setEditando(null); setF(vacio); }} className="text-sm text-[#5F5E5A] px-3">Cancelar</button>}
          </div>
        </form>
        {msg && <p className="text-sm mt-2">{msg}</p>}
        <p className="text-[11px] text-[#9C9A92] mt-2">
          El código identifica la obra en los documentos: inspecciones <b>INS-{f.codigo || 'COD'}-2026-001</b> y hallazgos <b>H-{f.codigo || 'COD'}-0001</b>.
          Cambiar el código solo afecta a los registros nuevos. Asigne el personal a la obra en Usuarios.
        </p>
      </Card>

      <div className="flex justify-between items-center">
        <span className="text-xs text-[#5F5E5A]">{obras.filter((o) => o.activo).length} obras activas · {obras.filter((o) => !o.activo).length} cerradas</span>
        <label className="text-xs flex items-center gap-1.5">
          <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> Mostrar obras cerradas
        </label>
      </div>

      <div className="space-y-2">
        {lista.map((o) => {
          const r = resumen[o.id] || { total: 0, abiertos: 0, vencidos: 0, usuarios: 0 };
          return (
            <div key={o.id} className={`bg-white border border-[#E3E1D9] rounded-xl p-3 ${o.activo ? '' : 'opacity-60'}`}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    <span className={`px-1.5 py-0.5 rounded mr-1.5 text-xs ${o.codigo ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#FCEBEB] text-[#A32D2D]'}`}>{o.codigo || 'SIN CÓDIGO'}</span>
                    {o.nombre}
                  </div>
                  <div className="text-xs text-[#5F5E5A] mt-0.5">{o.ubicacion || 'Sin ubicación'} · {o.activo ? 'Activa' : 'Cerrada'}</div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditando(o.id); setF({ codigo: o.codigo || '', nombre: o.nombre, ubicacion: o.ubicacion || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-xs bg-[#F1EFE8] text-[#0C447C] px-2.5 py-1.5 rounded-lg">✏️ Editar</button>
                  <button onClick={() => cambiarEstado(o)} className="text-xs bg-[#F1EFE8] text-[#5F5E5A] px-2.5 py-1.5 rounded-lg">{o.activo ? 'Cerrar' : 'Reabrir'}</button>
                </div>
              </div>
              <div className="flex gap-2 mt-2 text-[11px] flex-wrap">
                <a href={`/hallazgos?obra=${o.id}`} className="px-2 py-0.5 rounded-full bg-[#E6F1FB] text-[#0C447C]">{r.total} hallazgos</a>
                {r.abiertos > 0 && <span className="px-2 py-0.5 rounded-full bg-[#FAEEDA] text-[#854F0B]">{r.abiertos} abiertos</span>}
                {r.vencidos > 0 && <span className="px-2 py-0.5 rounded-full bg-[#FCEBEB] text-[#A32D2D]">{r.vencidos} vencidos</span>}
                <span className="px-2 py-0.5 rounded-full bg-[#F1EFE8] text-[#5F5E5A]">{r.usuarios} usuario(s) asignados</span>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-[#5F5E5A] text-center py-6">No hay obras registradas.</p>}
      </div>
    </div>
  );
}
