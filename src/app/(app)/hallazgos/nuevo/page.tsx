'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CAUSAS, NORMATIVAS, Perfil } from '@/lib/types';

const AREAS = [
  'Estructura / Civil', 'Eléctrico', 'Andamios / Escaleras', 'Bodega',
  'Oficinas', 'Áreas exteriores', 'Mecánica / Equipos',
];

export default function NuevoHallazgoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [area, setArea] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [criticidad, setCriticidad] = useState<'critico' | 'moderado' | 'bajo'>('moderado');
  const [causas, setCausas] = useState<string[]>([]);
  const [normativa, setNormativa] = useState<string[]>([]);
  const [responsable, setResponsable] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('perfiles').select('*').then(({ data }) => setUsuarios(data || []));
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setFechaLimite(d.toISOString().split('T')[0]);
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!area || descripcion.length < 10 || accion.length < 10 || !responsable || !fechaLimite) {
      setError('Completa los campos obligatorios (*)');
      return;
    }
    if (normativa.length === 0) {
      setError('Selecciona al menos una base normativa aplicable');
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user!.id).single();

    const codigo = 'H-' + Date.now().toString().slice(-6);

    const { data: nuevo, error: insertError } = await supabase
      .from('hallazgos')
      .insert({
        proyecto_id: perfil.proyecto_id,
        codigo,
        area,
        descripcion,
        accion_correctiva: accion,
        criticidad,
        causas,
        normativa,
        responsable_id: responsable,
        fecha_limite: fechaLimite,
        creado_por: perfil.id,
      })
      .select()
      .single();

    if (insertError || !nuevo) {
      setError('Error al guardar: ' + insertError?.message);
      setSaving(false);
      return;
    }

    // Subir fotos a Storage
    for (const foto of fotos) {
      const path = `${nuevo.id}/${Date.now()}-${foto.name}`;
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(path, foto);
      if (!uploadError) {
        await supabase.from('evidencias').insert({
          hallazgo_id: nuevo.id,
          storage_path: path,
          tipo: 'apertura',
          subido_por: perfil.id,
        });
      }
    }

    // Auditoría (append-only)
    await supabase.from('auditoria').insert({
      hallazgo_id: nuevo.id,
      accion: 'crear',
      usuario_id: perfil.id,
      detalle: 'Hallazgo registrado',
      cumplimiento_snapshot: 0,
      estado_snapshot: 'abierto',
    });

    // Notificación
    await supabase.from('notificaciones').insert({
      hallazgo_id: nuevo.id,
      destinatario_id: responsable,
      canal: 'email',
    });

    setSaving(false);
    router.push(`/hallazgos/${nuevo.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold mb-2">Nuevo hallazgo</h2>

      <Field label="Área / Lugar *">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="input">
          <option value="">Seleccionar...</option>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </Field>

      <Field label="Descripción del hallazgo *">
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input min-h-20" />
      </Field>

      <Field label="Acción correctiva *">
        <textarea value={accion} onChange={(e) => setAccion(e.target.value)} className="input min-h-20" />
      </Field>

      <Field label="Criticidad *">
        <select value={criticidad} onChange={(e) => setCriticidad(e.target.value as 'critico' | 'moderado' | 'bajo')} className="input">
          <option value="critico">🔴 Crítico</option>
          <option value="moderado">🟡 Moderado</option>
          <option value="bajo">🟢 Bajo</option>
        </select>
      </Field>

      <Field label="Causa raíz">
        <div className="grid grid-cols-2 gap-1.5">
          {CAUSAS.map((c) => (
            <Chip key={c.id} active={causas.includes(c.id)} onClick={() => toggle(causas, setCausas, c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Base normativa aplicable *">
        <div className="grid grid-cols-2 gap-1.5">
          {NORMATIVAS.map((n) => (
            <Chip key={n.id} active={normativa.includes(n.id)} onClick={() => toggle(normativa, setNormativa, n.id)}>
              {n.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Responsable de cierre *">
        <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="input">
          <option value="">Seleccionar...</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </Field>

      <Field label="Fecha límite *">
        <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="input" />
      </Field>

      <Field label="Evidencia fotográfica">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setFotos(Array.from(e.target.files || []))}
          className="text-sm"
        />
        {fotos.length > 0 && <p className="text-xs text-[#5F5E5A] mt-1">{fotos.length} foto(s) seleccionada(s)</p>}
      </Field>

      {error && <p className="text-sm text-[#A32D2D]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#185FA5] text-white rounded-lg py-3 text-sm font-medium disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar y notificar responsable'}
      </button>

      <style jsx global>{`
        .input { width:100%; border:1px solid #E3E1D9; border-radius:10px; padding:10px 12px; font-size:14px; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5F5E5A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      className={`px-2.5 py-2 rounded-lg border text-xs text-center cursor-pointer ${
        active ? 'bg-[#E6F1FB] border-[#185FA5] text-[#0C447C] font-semibold' : 'border-[#E3E1D9] text-[#5F5E5A]'
      }`}
    >
      {children}
    </div>
  );
}
