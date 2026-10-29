'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Accion } from '@/lib/permisos';
import { ROL_LABEL, type Perfil } from '@/lib/types';
import { subirFotos, type FotoItem } from '@/lib/imagen';
import { Card, Field, SectionTitle, inputCls, btnPrimary, btnSecondary } from '@/components/ui';
import FotoUploader from '@/components/FotoUploader';
import FirmaPad from '@/components/FirmaPad';

interface H {
  id: string; codigo: string; estado: string; responsable_id: string | null; verificador_id: string | null;
  fecha_limite: string; cumplimiento: number; recibido_en: string | null; motivo_rechazo: string | null;
}

const TITULO: Record<Accion, string> = {
  recibir: '✍ Firmar recepción',
  avance: '📈 Registrar avance',
  enviar_verificacion: '📤 Cargar evidencia y enviar a SST',
  aprobar: '✅ Aprobar cierre',
  rechazar: '❌ Rechazar cierre',
  reasignar: '👥 Reasignar / cambiar plazo',
  notificar: '🔔 Reenviar notificación',
};

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

export default function PanelAcciones({ hallazgo: h, acciones, usuarios }: { hallazgo: H; acciones: Accion[]; usuarios: Perfil[] }) {
  const router = useRouter();
  const visibles = acciones.filter((a) => !(a === 'recibir' && h.recibido_en));
  const principal: Accion | undefined =
    visibles.includes('aprobar') ? 'aprobar'
      : !h.recibido_en && visibles.includes('recibir') ? 'recibir'
        : visibles.includes('enviar_verificacion') ? 'enviar_verificacion' : undefined;
  const [activa, setActiva] = useState<Accion | null>(principal || null);
  const [v, setV] = useState({
    comentario: '', cumplimiento: String(h.cumplimiento), fecha_ejecucion: hoy(), acciones_implementadas: '',
    observaciones_responsable: '', verificacion_resultado: '', motivo_rechazo: '', nueva_fecha_limite: '',
    responsable_id: h.responsable_id || '', verificador_id: h.verificador_id || '', fecha_limite: h.fecha_limite,
  });
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [firma, setFirma] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function ejecutar(accion: Accion) {
    setError(''); setOk(''); setEnviando(true);
    try {
      const evidencias = fotos.length ? await subirFotos(h.id, fotos, accion === 'enviar_verificacion' ? 'cierre' : 'avance') : [];
      const res = await fetch(`/api/hallazgos/${h.id}/accion`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...v, cumplimiento: Number(v.cumplimiento), evidencias, firma_png: firma || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción');
      const envios = (data.notificaciones || []) as { destinatario: string; canal: string; ok: boolean; detalle: string }[];
      const fallos = envios.filter((e) => !e.ok);
      setOk(`Listo. ${envios.length ? `Notificaciones: ${envios.length - fallos.length} enviadas` : ''}${fallos.length ? ` · ${fallos.length} con error (${fallos.map((f) => `${f.destinatario}: ${f.detalle}`).join('; ')})` : ''}`);
      setFotos([]); setFirma(''); setActiva(null);
      setV((p) => ({ ...p, comentario: '' }));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setEnviando(false);
  }

  return (
    <Card className="border-[#185FA5] border-2">
      <SectionTitle>Acciones disponibles</SectionTitle>
      {h.motivo_rechazo && h.estado === 'en_proceso' && (
        <p className="text-xs bg-[#FCEBEB] text-[#A32D2D] rounded-lg p-2 mb-2">Último rechazo SST: {h.motivo_rechazo}</p>
      )}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {visibles.map((a) => (
          <button key={a} type="button" onClick={() => { setActiva(activa === a ? null : a); setError(''); }}
            className={`text-xs px-3 py-2 rounded-lg font-medium ${activa === a ? 'bg-[#185FA5] text-white' : 'bg-[#F1EFE8] text-[#0C447C]'}`}>
            {TITULO[a]}
          </button>
        ))}
      </div>

      {activa === 'recibir' && (
        <div className="space-y-2">
          <p className="text-xs text-[#5F5E5A]">Al firmar, el responsable (Residente, Jefe de Obra o Coordinador SST) declara haber recibido el hallazgo {h.codigo} y se compromete a cumplir la medida correctiva hasta la fecha límite.</p>
          <FirmaPad onChange={setFirma} />
          <button disabled={enviando} onClick={() => ejecutar('recibir')} className={`${btnPrimary} w-full`}>{enviando ? 'Firmando...' : 'Firmar recepción'}</button>
        </div>
      )}

      {activa === 'avance' && (
        <div className="space-y-2">
          <Field label={`% de avance: ${v.cumplimiento}%`}>
            <input type="range" min={0} max={95} step={5} value={v.cumplimiento} onChange={(e) => set('cumplimiento', e.target.value)} className="w-full" />
          </Field>
          <textarea value={v.comentario} onChange={(e) => set('comentario', e.target.value)} placeholder="Describa el avance..." className={`${inputCls} min-h-16`} />
          <FotoUploader fotos={fotos} onChange={setFotos} label="Fotos de avance" />
          <button disabled={enviando} onClick={() => ejecutar('avance')} className={`${btnPrimary} w-full`}>{enviando ? 'Guardando...' : 'Guardar avance'}</button>
        </div>
      )}

      {activa === 'enviar_verificacion' && (
        <div className="space-y-2">
          <Field label="Fecha de ejecución de la medida *">
            <input type="date" value={v.fecha_ejecucion} max={hoy()} onChange={(e) => set('fecha_ejecucion', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Acciones implementadas *">
            <textarea value={v.acciones_implementadas} onChange={(e) => set('acciones_implementadas', e.target.value)} className={`${inputCls} min-h-20`} />
          </Field>
          <Field label="Observaciones del responsable">
            <textarea value={v.observaciones_responsable} onChange={(e) => set('observaciones_responsable', e.target.value)} className={`${inputCls} min-h-14`} />
          </Field>
          <Field label="Evidencia fotográfica del DESPUÉS *" hint="Tome la foto desde el mismo ángulo que la evidencia inicial.">
            <FotoUploader fotos={fotos} onChange={setFotos} label="Fotos de cumplimiento" />
          </Field>
          <Field label="Firma de ejecución (Residente / Jefe de Obra)"><FirmaPad onChange={setFirma} /></Field>
          <button disabled={enviando} onClick={() => ejecutar('enviar_verificacion')} className={`${btnPrimary} w-full`}>{enviando ? 'Enviando...' : 'Enviar a verificación SST'}</button>
        </div>
      )}

      {activa === 'aprobar' && (
        <div className="space-y-2">
          <Field label="Resultado de la verificación SST *">
            <textarea value={v.verificacion_resultado} onChange={(e) => set('verificacion_resultado', e.target.value)} placeholder="Ej.: Se verificó en campo la baranda instalada a 1.0 m con rodapié. Medida eficaz." className={`${inputCls} min-h-16`} />
          </Field>
          <Field label="Firma del Coordinador SST"><FirmaPad onChange={setFirma} /></Field>
          <button disabled={enviando} onClick={() => ejecutar('aprobar')} className="w-full bg-[#3B6D11] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">{enviando ? 'Cerrando...' : 'Aprobar y cerrar hallazgo'}</button>
        </div>
      )}

      {activa === 'rechazar' && (
        <div className="space-y-2">
          <Field label="Motivo del rechazo *">
            <textarea value={v.motivo_rechazo} onChange={(e) => set('motivo_rechazo', e.target.value)} className={`${inputCls} min-h-16`} />
          </Field>
          <Field label="Resultado de la verificación"><input value={v.verificacion_resultado} onChange={(e) => set('verificacion_resultado', e.target.value)} placeholder="No conforme" className={inputCls} /></Field>
          <Field label="Nueva fecha límite (opcional)"><input type="date" value={v.nueva_fecha_limite} onChange={(e) => set('nueva_fecha_limite', e.target.value)} className={inputCls} /></Field>
          <button disabled={enviando} onClick={() => ejecutar('rechazar')} className="w-full bg-[#A32D2D] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">{enviando ? 'Enviando...' : 'Rechazar cierre y devolver al responsable'}</button>
        </div>
      )}

      {activa === 'reasignar' && (
        <div className="space-y-2">
          <Field label="Responsable de ejecutar">
            <select value={v.responsable_id} onChange={(e) => set('responsable_id', e.target.value)} className={inputCls}>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.cargo || ROL_LABEL[u.rol]}</option>)}
            </select>
          </Field>
          <Field label="Responsable de verificar">
            <select value={v.verificador_id} onChange={(e) => set('verificador_id', e.target.value)} className={inputCls}>
              <option value="">Personal SST</option>
              {usuarios.filter((u) => ['coordinador_sst', 'tecnico_sso', 'admin'].includes(u.rol)).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Field>
          <Field label="Fecha límite"><input type="date" value={v.fecha_limite} onChange={(e) => set('fecha_limite', e.target.value)} className={inputCls} /></Field>
          <input value={v.comentario} onChange={(e) => set('comentario', e.target.value)} placeholder="Motivo de la reasignación" className={inputCls} />
          <button disabled={enviando} onClick={() => ejecutar('reasignar')} className={`${btnPrimary} w-full`}>{enviando ? 'Guardando...' : 'Guardar y notificar'}</button>
        </div>
      )}

      {activa === 'notificar' && (
        <button disabled={enviando} onClick={() => ejecutar('notificar')} className={`${btnSecondary} w-full`}>{enviando ? 'Enviando...' : 'Enviar recordatorio por correo ahora'}</button>
      )}

      {error && <p className="text-sm text-[#A32D2D] mt-2">{error}</p>}
      {ok && <p className="text-xs text-[#3B6D11] mt-2">{ok}</p>}
    </Card>
  );
}
