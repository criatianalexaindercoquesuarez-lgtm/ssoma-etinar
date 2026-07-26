'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CAUSAS, NORMATIVAS, AuditoriaItem, Hallazgo } from '@/lib/types';

export default function DetalleHallazgoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [h, setH] = useState<Hallazgo | null>(null);
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const [pct, setPct] = useState(0);
  const [estado, setEstado] = useState('abierto');
  const [comentario, setComentario] = useState('');
  const [nuevasFotos, setNuevasFotos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data: hallazgo } = await supabase.from('hallazgos').select('*').eq('id', id).single();
    if (!hallazgo) return;
    setH(hallazgo);
    setPct(hallazgo.cumplimiento);
    setEstado(hallazgo.estado);

    const { data: evidencias } = await supabase.from('evidencias').select('*').eq('hallazgo_id', id).eq('eliminado', false);
    setFotos(
      (evidencias || []).map((e) => ({
        id: e.id,
        url: supabase.storage.from('evidencias').getPublicUrl(e.storage_path).data.publicUrl,
      }))
    );

    const { data: audit } = await supabase
      .from('auditoria')
      .select('*')
      .eq('hallazgo_id', id)
      .order('creado_en', { ascending: false });
    setAuditoria(audit || []);
  }, [id, supabase]);

  useEffect(() => {
    cargar();
    // Realtime: refrescar cuando cambie este hallazgo o se agregue auditoría/evidencia
    const channel = supabase
      .channel(`hallazgo-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hallazgos', filter: `id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auditoria', filter: `hallazgo_id=eq.${id}` }, cargar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'evidencias', filter: `hallazgo_id=eq.${id}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, cargar, supabase]);

  async function guardarAvance() {
    if (!h) return;
    setError('');
    if (!comentario.trim()) { setError('Agrega un comentario de avance'); return; }
    const totalFotos = fotos.length + nuevasFotos.length;
    if (estado === 'cerrado' && totalFotos === 0) {
      setError('No se puede cerrar sin evidencia fotográfica de la corrección');
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user!.id).single();
    const cumplimientoFinal = estado === 'cerrado' ? 100 : pct;

    // 1) Subir evidencia PRIMERO. Si falla y se requiere para cerrar, se detiene
    //    todo antes de tocar el estado del hallazgo — así nunca queda "Cerrado"
    //    sin evidencia real guardada en la base de datos.
    let fotosSubidasOk = true;
    for (const foto of nuevasFotos) {
      const path = `${h.id}/${Date.now()}-${foto.name}`;
      const { error: upErr } = await supabase.storage.from('evidencias').upload(path, foto);
      if (upErr) { fotosSubidasOk = false; setError('Error al subir foto: ' + upErr.message); break; }
      const { error: evErr } = await supabase.from('evidencias').insert({
        hallazgo_id: h.id,
        storage_path: path,
        tipo: estado === 'cerrado' ? 'cierre' : 'avance',
        subido_por: perfil.id,
      });
      if (evErr) { fotosSubidasOk = false; setError('Error al registrar evidencia: ' + evErr.message); break; }
    }

    if (!fotosSubidasOk) {
      setSaving(false);
      return; // no se toca el hallazgo ni la auditoría si la evidencia falló
    }

    // 2) Solo si la evidencia (cuando aplica) se guardó bien, se actualiza el hallazgo.
    const { error: updErr } = await supabase
      .from('hallazgos')
      .update({ cumplimiento: cumplimientoFinal, estado, actualizado_en: new Date().toISOString() })
      .eq('id', h.id);
    if (updErr) {
      setError('Error al actualizar el hallazgo: ' + updErr.message);
      setSaving(false);
      return;
    }

    // 3) Auditoría (append-only). Si esto falla, se avisa pero no se revierte
    //    el estado — se registra el error para revisión.
    const { error: audErr } = await supabase.from('auditoria').insert({
      hallazgo_id: h.id,
      accion: estado === 'cerrado' ? 'cerrar' : 'avance',
      usuario_id: perfil.id,
      detalle: `${comentario} — ${cumplimientoFinal}%`,
      cumplimiento_snapshot: cumplimientoFinal,
      estado_snapshot: estado,
    });
    if (audErr) {
      setError('El hallazgo se guardó, pero el historial de auditoría falló: ' + audErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setComentario('');
    setNuevasFotos([]);
    await cargar();

    // Redirección automática: si quedó cerrado, vuelve a la lista de hallazgos
    // en vez de dejar al usuario parado en el detalle.
    if (estado === 'cerrado') {
      router.push('/hallazgos');
    }
  }

  if (!h) return <p className="text-sm text-[#5F5E5A] text-center py-10">Cargando...</p>;

  const vencido = h.estado !== 'cerrado' && new Date(h.fecha_limite) < new Date(new Date().toDateString());

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">{h.codigo}</h2>
        <button onClick={() => router.back()} className="text-sm text-[#5F5E5A]">✕</button>
      </div>

      <div className="flex gap-1.5 flex-wrap text-xs">
        <Badge>{h.criticidad === 'critico' ? '🔴 Crítico' : h.criticidad === 'moderado' ? '🟡 Moderado' : '🟢 Bajo'}</Badge>
        <Badge>{h.estado === 'abierto' ? 'Abierto' : h.estado === 'en_proceso' ? 'En proceso' : 'Cerrado'}</Badge>
        {vencido && <Badge red>⚠ Vencido</Badge>}
      </div>

      <Card>
        <SectionTitle>Descripción</SectionTitle>
        <p className="text-sm mb-3">{h.descripcion}</p>
        <SectionTitle>Acción correctiva</SectionTitle>
        <p className="text-sm bg-[#EAF3DE] p-2.5 rounded-lg">{h.accion_correctiva}</p>
      </Card>

      <Card>
        <Row label="Área" value={h.area} />
        <Row label="Cierre límite" value={new Date(h.fecha_limite).toLocaleDateString('es-EC')} />
        <Row label="Causa raíz" value={h.causas.map((c) => CAUSAS.find((x) => x.id === c)?.label).join(', ') || '—'} />
        <Row label="Base normativa" value={h.normativa.map((n) => NORMATIVAS.find((x) => x.id === n)?.label).join(', ') || '—'} />
      </Card>

      <Card>
        <SectionTitle>Evidencia fotográfica ({fotos.length})</SectionTitle>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {fotos.map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-[#F1EFE8]">
              <img src={f.url} className="w-full h-full object-cover" alt="evidencia" />
            </a>
          ))}
          {fotos.length === 0 && <p className="col-span-4 text-xs text-[#5F5E5A] text-center py-4">Sin fotos aún</p>}
        </div>
      </Card>

      <Card>
        <SectionTitle>Historial de seguimiento</SectionTitle>
        <div className="space-y-3 mt-2">
          {auditoria.map((a) => (
            <div key={a.id} className="text-xs">
              <div className="text-[#5F5E5A]">{new Date(a.creado_en).toLocaleString('es-EC')}</div>
              <div>{a.detalle || a.accion}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Registrar avance</SectionTitle>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-[#5F5E5A]">% cumplimiento: {pct}%</label>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(+e.target.value)} className="w-full" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm">
            <option value="abierto">Abierto</option>
            <option value="en_proceso">En proceso</option>
            <option value="cerrado">Cerrado</option>
          </select>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario de avance..."
            className="w-full border border-[#E3E1D9] rounded-lg px-3 py-2 text-sm min-h-16"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => setNuevasFotos(Array.from(e.target.files || []))}
            className="text-sm"
          />
          {estado === 'cerrado' && (
            <p className="text-[11px] text-[#854F0B]">Obligatorio: al menos una foto de evidencia para cerrar.</p>
          )}
          {error && <p className="text-sm text-[#A32D2D]">{error}</p>}
          <button
            onClick={guardarAvance}
            disabled={saving}
            className="w-full bg-[#639922] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar avance'}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-[#E3E1D9] rounded-xl p-3.5">{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold text-[#5F5E5A] uppercase tracking-wide">{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-2 border-b border-[#F1EFE8] last:border-0 text-sm">
      <div className="text-[#5F5E5A] min-w-[110px]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function Badge({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <span className={`px-2 py-1 rounded-lg font-semibold ${red ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]'}`}>
      {children}
    </span>
  );
}
