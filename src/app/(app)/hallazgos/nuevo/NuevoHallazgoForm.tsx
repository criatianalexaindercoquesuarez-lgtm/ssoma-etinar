'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AREAS, CAUSAS, NORMATIVAS, ROL_LABEL, TIPO_DESVIACION, PRIORIDAD_COLOR, PRIORIDAD_LABEL, type Perfil } from '@/lib/types';
import { ND_OPCIONES, NE_OPCIONES, NC_OPCIONES, FACTORES_RIESGO, calcularGTC45 } from '@/lib/gtc45';
import { subirFotos, type FotoItem } from '@/lib/imagen';
import { Card, Field, SectionTitle, inputCls, btnPrimary } from '@/components/ui';
import FotoUploader from '@/components/FotoUploader';
import FirmaPad from '@/components/FirmaPad';

interface InspOpt {
  id: string; codigo: string; fecha_hora: string; area: string | null; ubicacion: string | null;
  nivel: string | null; frente: string | null; contratista: string | null; proyectos: { nombre: string } | null;
}

const sumarDias = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
};

export default function NuevoHallazgoForm({ inspecciones, usuarios, inspeccionInicial }: {
  inspecciones: InspOpt[]; usuarios: Perfil[]; inspeccionInicial: string;
}) {
  const router = useRouter();
  const ins0 = inspecciones.find((i) => i.id === inspeccionInicial);
  const [f, setF] = useState({
    inspeccion_id: inspeccionInicial,
    area: ins0?.area || '', ubicacion: ins0?.ubicacion || '', nivel: ins0?.nivel || '', frente: ins0?.frente || '',
    contratista: ins0?.contratista || '',
    descripcion: '', tipo_desviacion: 'condicion_insegura', peligro: '', factor_riesgo: 'condiciones_seguridad',
    consecuencias: '', trabajadores_expuestos: '', personas_afectadas: '',
    nd: '', ne: '', nc: '',
    accion_inmediata: '', accion_correctiva: '', medida_preventiva: '',
    responsable_id: '', verificador_id: '', fecha_limite: '',
  });
  const [causas, setCausas] = useState<string[]>([]);
  const [normativa, setNormativa] = useState<string[]>([]);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [firma, setFirma] = useState('');
  const [plazoManual, setPlazoManual] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const gtc = useMemo(() => calcularGTC45(f.nd === '' ? null : +f.nd, f.ne === '' ? null : +f.ne, f.nc === '' ? null : +f.nc), [f.nd, f.ne, f.nc]);
  const fechaSugerida = gtc ? sumarDias(gtc.plazoDias) : '';
  const fechaLimite = plazoManual ? f.fecha_limite : fechaSugerida;

  const verificadores = usuarios.filter((u) => ['coordinador_sst', 'tecnico_sso', 'admin'].includes(u.rol));

  function cambiarInspeccion(id: string) {
    const i = inspecciones.find((x) => x.id === id);
    setF((p) => ({ ...p, inspeccion_id: id, area: i?.area || p.area, ubicacion: i?.ubicacion || '', nivel: i?.nivel || '', frente: i?.frente || '', contratista: i?.contratista || '' }));
  }
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const faltan = [
      !f.inspeccion_id && 'inspección', !f.area && 'área', f.descripcion.length < 10 && 'descripción (mín. 10 caracteres)',
      !f.peligro && 'peligro', !f.consecuencias && 'consecuencias', !gtc && 'evaluación GTC-45 (ND, NE, NC)',
      f.accion_correctiva.length < 5 && 'medida correctiva', !f.responsable_id && 'responsable de ejecutar',
      !fechaLimite && 'fecha límite', fotos.length === 0 && 'al menos una foto inicial',
    ].filter(Boolean);
    if (faltan.length) { setError('Falta: ' + faltan.join(', ')); return; }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const evidencias = await subirFotos(id, fotos, 'inicial');
      const res = await fetch('/api/hallazgos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f, id, nd: +f.nd, ne: +f.ne, nc: +f.nc, fecha_limite: fechaLimite,
          trabajadores_expuestos: f.trabajadores_expuestos ? +f.trabajadores_expuestos : null,
          personas_afectadas: f.personas_afectadas ? +f.personas_afectadas : null,
          verificador_id: f.verificador_id || null, causas, normativa, evidencias, firma_png: firma || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      router.push(`/hallazgos/${data.id}?nuevo=1`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (inspecciones.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-[#5F5E5A]">Primero registre la inspección (datos generales) y luego sus hallazgos.</p>
        <Link href="/inspecciones/nueva" className={btnPrimary}>+ Nueva inspección</Link>
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-3 max-w-2xl mx-auto">
      <h2 className="text-base font-semibold">Nuevo hallazgo</h2>

      <Card className="space-y-3">
        <SectionTitle n="A">Inspección y ubicación</SectionTitle>
        <Field label="Inspección *">
          <select value={f.inspeccion_id} onChange={(e) => cambiarInspeccion(e.target.value)} className={inputCls}>
            {inspecciones.map((i) => (
              <option key={i.id} value={i.id}>{i.codigo} · {i.proyectos?.nombre} · {new Date(i.fecha_hora).toLocaleDateString('es-EC')}</option>
            ))}
          </select>
          <Link href="/inspecciones/nueva" className="text-[11px] text-[#185FA5]">+ Crear otra inspección</Link>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área *">
            <select value={f.area} onChange={(e) => set('area', e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Ubicación"><input value={f.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} className={inputCls} /></Field>
          <Field label="Nivel"><input value={f.nivel} onChange={(e) => set('nivel', e.target.value)} className={inputCls} /></Field>
          <Field label="Frente de trabajo"><input value={f.frente} onChange={(e) => set('frente', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Empresa contratista"><input value={f.contratista} onChange={(e) => set('contratista', e.target.value)} className={inputCls} /></Field>
      </Card>

      <Card className="space-y-3">
        <SectionTitle n="B">Identificación del hallazgo</SectionTitle>
        <Field label="Descripción detallada de la condición observada *">
          <textarea value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} className={`${inputCls} min-h-20`} />
        </Field>
        <Field label="Evidencia fotográfica inicial *">
          <FotoUploader fotos={fotos} onChange={setFotos} label="Tomar / agregar fotos" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <select value={f.tipo_desviacion} onChange={(e) => set('tipo_desviacion', e.target.value)} className={inputCls}>
              {TIPO_DESVIACION.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Factor de riesgo (GTC-45) *">
            <select value={f.factor_riesgo} onChange={(e) => set('factor_riesgo', e.target.value)} className={inputCls}>
              {FACTORES_RIESGO.map((t) => <option key={t.id} value={t.id}>{t.label.split(' (')[0]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Peligro identificado *">
          <input value={f.peligro} onChange={(e) => set('peligro', e.target.value)} placeholder="Ej.: Trabajo en altura sin protección de borde" className={inputCls} />
        </Field>
        <Field label="Consecuencias potenciales *" hint="Lesiones, accidentes, daños materiales u otras afectaciones">
          <textarea value={f.consecuencias} onChange={(e) => set('consecuencias', e.target.value)} className={`${inputCls} min-h-16`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trabajadores expuestos"><input type="number" min={0} value={f.trabajadores_expuestos} onChange={(e) => set('trabajadores_expuestos', e.target.value)} className={inputCls} /></Field>
          <Field label="Otras personas potencialmente afectadas"><input type="number" min={0} value={f.personas_afectadas} onChange={(e) => set('personas_afectadas', e.target.value)} className={inputCls} /></Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle n="B">Evaluación del riesgo — GTC-45</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Nivel de deficiencia (ND) *">
            <select value={f.nd} onChange={(e) => set('nd', e.target.value)} className={inputCls}>
              <option value="">—</option>{ND_OPCIONES.map((o) => <option key={o.valor} value={o.valor} title={o.ayuda}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Nivel de exposición (NE) *">
            <select value={f.ne} onChange={(e) => set('ne', e.target.value)} className={inputCls}>
              <option value="">—</option>{NE_OPCIONES.map((o) => <option key={o.valor} value={o.valor} title={o.ayuda}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Nivel de consecuencia (NC) *">
            <select value={f.nc} onChange={(e) => set('nc', e.target.value)} className={inputCls}>
              <option value="">—</option>{NC_OPCIONES.map((o) => <option key={o.valor} value={o.valor} title={o.ayuda}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        {gtc && (
          <div className="rounded-lg p-3 text-white" style={{ background: PRIORIDAD_COLOR[gtc.prioridad] }}>
            <div className="text-sm font-bold">Nivel de riesgo {gtc.nivel} · Prioridad {PRIORIDAD_LABEL[gtc.prioridad]}</div>
            <div className="text-xs opacity-95">NP = {gtc.np} ({gtc.interpNP}) · NR = NP × NC = {gtc.nr} · {gtc.significado}</div>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle n="C">Medidas correctivas y preventivas</SectionTitle>
        <Field label="Acción inmediata para controlar el riesgo">
          <textarea value={f.accion_inmediata} onChange={(e) => set('accion_inmediata', e.target.value)} placeholder="Ej.: Se suspendió la actividad y se señalizó el borde" className={`${inputCls} min-h-14`} />
        </Field>
        <Field label="Medida correctiva requerida *">
          <textarea value={f.accion_correctiva} onChange={(e) => set('accion_correctiva', e.target.value)} className={`${inputCls} min-h-16`} />
        </Field>
        <Field label="Medida preventiva (evitar recurrencia)">
          <textarea value={f.medida_preventiva} onChange={(e) => set('medida_preventiva', e.target.value)} className={`${inputCls} min-h-14`} />
        </Field>
        <Field label="Responsable directo de ejecutar *" hint="Residente, Jefe de Obra o contratista. Recibe el reporte y las notificaciones por correo.">
          <select value={f.responsable_id} onChange={(e) => set('responsable_id', e.target.value)} className={inputCls}>
            <option value="">Seleccionar...</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.cargo || ROL_LABEL[u.rol]}</option>)}
          </select>
        </Field>
        <Field label="Responsable de verificar el cumplimiento (SST)">
          <select value={f.verificador_id} onChange={(e) => set('verificador_id', e.target.value)} className={inputCls}>
            <option value="">Cualquier Coordinador / Técnico SST</option>
            {verificadores.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.cargo || ROL_LABEL[u.rol]}</option>)}
          </select>
        </Field>
        <Field label="Plazo máximo de cumplimiento *" hint={gtc ? `Sugerido por nivel ${gtc.nivel}: ${gtc.plazoDias} día(s)` : 'Se sugiere al completar la evaluación GTC-45'}>
          <div className="flex gap-2 items-center">
            <input type="date" value={fechaLimite} onChange={(e) => { setPlazoManual(true); set('fecha_limite', e.target.value); }} className={inputCls} />
            {plazoManual && <button type="button" onClick={() => setPlazoManual(false)} className="text-[11px] text-[#185FA5] whitespace-nowrap">Usar sugerido</button>}
          </div>
        </Field>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Causa raíz y base normativa</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {CAUSAS.map((c) => <Chip key={c.id} active={causas.includes(c.id)} onClick={() => toggle(causas, setCausas, c.id)}>{c.label}</Chip>)}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {NORMATIVAS.map((n) => <Chip key={n.id} active={normativa.includes(n.id)} onClick={() => toggle(normativa, setNormativa, n.id)}>{n.label}</Chip>)}
        </div>
      </Card>

      <Card className="space-y-2">
        <SectionTitle>Firma del inspector (elaborado por)</SectionTitle>
        <FirmaPad onChange={setFirma} />
      </Card>

      {error && <p className="text-sm text-[#A32D2D]">{error}</p>}
      <button disabled={saving} className={`${btnPrimary} w-full py-3`}>
        {saving ? 'Guardando y notificando...' : 'Registrar hallazgo y notificar al responsable'}
      </button>
    </form>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-2 rounded-lg border text-xs text-center ${active ? 'bg-[#E6F1FB] border-[#185FA5] text-[#0C447C] font-semibold' : 'border-[#E3E1D9] text-[#5F5E5A]'}`}>
      {children}
    </button>
  );
}
