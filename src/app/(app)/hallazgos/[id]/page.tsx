import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  ACCION_LABEL, CAUSAS, FIRMA_LABEL, NORMATIVAS, TIPO_DESVIACION, fmtFecha, fmtFechaHora,
  type Evidencia, type Firma, type HallazgoVista, type Perfil,
} from '@/lib/types';
import { factorLabel, NIVEL_RIESGO_INFO } from '@/lib/gtc45';
import { puede, type Accion } from '@/lib/permisos';
import { Card, EstadoBadge, PrioridadBadge, Row, SectionTitle } from '@/components/ui';
import PanelAcciones from './PanelAcciones';
import RealtimeRefresh from '@/components/RealtimeRefresh';

export const dynamic = 'force-dynamic';

export default async function DetalleHallazgo({ params, searchParams }: { params: { id: string }; searchParams: { nuevo?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: yo } = await supabase.from('perfiles').select('*').eq('id', user.id).single<Perfil>();
  const { data: h } = await supabase.from('v_hallazgos').select('*').eq('id', params.id).single<HallazgoVista>();
  if (!h || !yo) notFound();

  const [{ data: ev }, { data: audit }, { data: firmasRaw }, { data: notifs }, { data: usuarios }] = await Promise.all([
    supabase.from('evidencias').select('*').eq('hallazgo_id', h.id).eq('eliminado', false).order('creado_en'),
    supabase.from('auditoria').select('*, perfiles(nombre)').eq('hallazgo_id', h.id).order('creado_en', { ascending: false }),
    supabase.from('firmas').select('*').eq('hallazgo_id', h.id).order('creado_en'),
    supabase.from('notificaciones').select('*, dest:perfiles!notificaciones_destinatario_id_fkey(nombre)')
      .eq('hallazgo_id', h.id).neq('canal', 'sistema').order('creado_en', { ascending: false }).limit(60),
    supabase.from('perfiles').select('id,nombre,rol,cargo').eq('activo', true).order('nombre'),
  ]);
  const url = (p: string) => supabase.storage.from('evidencias').getPublicUrl(p).data.publicUrl;
  const evidencias = ((ev || []) as Evidencia[]).map((e) => ({ ...e, url: url(e.storage_path) }));
  const firmas = ((firmasRaw || []) as Firma[]).map((f) => ({ ...f, url: f.firma_path ? url(f.firma_path) : null }));
  const ultima = (t: Firma['tipo']) => [...firmas].reverse().find((f) => f.tipo === t);

  const acciones = (['recibir', 'avance', 'enviar_verificacion', 'aprobar', 'rechazar', 'reasignar', 'notificar'] as Accion[])
    .filter((a) => puede(a, h, yo));
  const info = h.nivel_riesgo ? NIVEL_RIESGO_INFO[h.nivel_riesgo] : null;
  const tipo = TIPO_DESVIACION.find((t) => t.id === h.tipo_desviacion)?.label;

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <RealtimeRefresh hallazgoId={h.id} />
      {searchParams.nuevo && (
        <div className="bg-[#EAF3DE] text-[#3B6D11] text-sm rounded-xl p-3">
          ✅ Hallazgo {h.codigo} registrado. Se notificó por correo al responsable y a los implicados.
        </div>
      )}
      <div className="flex justify-between items-start gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#185FA5]">{h.codigo}</h2>
          <p className="text-xs text-[#5F5E5A]">🏗️ {h.obra_nombre} · Inspección {h.inspeccion_codigo || '—'}</p>
        </div>
        <a href={`/api/export/hallazgo/${h.id}`} className="text-xs bg-[#185FA5] text-white font-semibold px-3 py-2 rounded-lg whitespace-nowrap">
          ⬇ Reporte PDF
        </a>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <PrioridadBadge prioridad={h.prioridad} nivel={h.nivel_riesgo} />
        <EstadoBadge estado={h.estado_efectivo} />
        {h.reincidente_de && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEEDFE] text-[#534AB7]">♻ Reincidente</span>}
      </div>

      {acciones.length > 0 && (
        <PanelAcciones
          hallazgo={{ id: h.id, codigo: h.codigo, estado: h.estado, responsable_id: h.responsable_id, verificador_id: h.verificador_id, fecha_limite: h.fecha_limite, cumplimiento: h.cumplimiento, recibido_en: h.recibido_en, motivo_rechazo: h.motivo_rechazo }}
          acciones={acciones}
          usuarios={(usuarios || []) as Perfil[]}
        />
      )}

      <Card>
        <SectionTitle n="1">Hallazgo detectado</SectionTitle>
        <Row label="Fecha de detección" value={fmtFechaHora(h.inspeccion_fecha || h.creado_en)} />
        <Row label="Inspector" value={h.inspector_nombre || h.creador_nombre} />
        <Row label="Ubicación" value={[h.area, h.ubicacion, h.nivel, h.frente].filter(Boolean).join(' · ')} />
        <Row label="Contratista" value={h.contratista} />
        <Row label="Condición observada" value={h.descripcion} />
        <Row label="Tipo" value={tipo} />
        <Row label="Peligro" value={h.peligro} />
        <Row label="Factor de riesgo" value={factorLabel(h.factor_riesgo)} />
        <Row label="Consecuencias potenciales" value={h.consecuencias} />
        <Row label="Expuestos / afectados" value={`${h.trabajadores_expuestos ?? '—'} trabajadores · ${h.personas_afectadas ?? '—'} otras personas`} />
        <Row label="Evaluación GTC-45" value={h.nr != null ? `ND ${h.nd} × NE ${h.ne} = NP ${h.np} · × NC ${h.nc} = NR ${h.nr} → Nivel ${h.nivel_riesgo}` : '—'} />
        {info && <Row label="Interpretación" value={info.significado} />}
        <Row label="Causa raíz" value={(h.causas || []).map((c) => CAUSAS.find((x) => x.id === c)?.label).join(', ')} />
        <Row label="Base normativa" value={(h.normativa || []).map((n) => NORMATIVAS.find((x) => x.id === n)?.label).join(', ')} />
        <Fotos titulo="Evidencia inicial" fotos={evidencias.filter((e) => e.tipo === 'apertura')} />
      </Card>

      <Card>
        <SectionTitle n="2">Entrega al responsable</SectionTitle>
        <Row label="Acción inmediata" value={h.accion_inmediata} />
        <Row label="Medida correctiva" value={<span className="bg-[#EAF3DE] px-1">{h.accion_correctiva}</span>} />
        <Row label="Medida preventiva" value={h.medida_preventiva} />
        <Row label="Responsable de ejecutar" value={`${h.responsable_nombre || '—'}${h.responsable_cargo ? ' · ' + h.responsable_cargo : ''}`} />
        <Row label="Responsable de verificar" value={h.verificador_nombre || 'Personal SST'} />
        <Row label="Fecha de asignación" value={fmtFecha(h.fecha_asignacion)} />
        <Row label="Fecha límite" value={<span className={h.estado_efectivo === 'vencido' ? 'text-[#A32D2D] font-bold' : ''}>{fmtFecha(h.fecha_limite)}{h.estado_efectivo === 'vencido' ? ` (vencido hace ${h.dias_vencido} días)` : ''}</span>} />
        <Row label="Recepción" value={h.recibido_en ? `Firmada ${fmtFechaHora(h.recibido_en)}` : 'Pendiente de acuse de recibo'} />
      </Card>

      <Card>
        <SectionTitle n="3">Evidencia de cumplimiento</SectionTitle>
        <Row label="Avance" value={`${h.cumplimiento}%`} />
        <Row label="Fecha de ejecución" value={fmtFecha(h.fecha_ejecucion)} />
        <Row label="Acciones implementadas" value={h.acciones_implementadas} />
        <Row label="Observaciones del responsable" value={h.observaciones_responsable} />
        <Fotos titulo="Avances" fotos={evidencias.filter((e) => e.tipo === 'avance')} />
        <Fotos titulo="Después (evidencia de cierre)" fotos={evidencias.filter((e) => e.tipo === 'cierre')} />
      </Card>

      <Card>
        <SectionTitle n="4">Verificación y cierre SST</SectionTitle>
        <Row label="Resultado de verificación" value={h.verificacion_resultado} />
        <Row label="Decisión" value={h.cierre_aprobado === true ? '✅ Cierre aprobado' : h.cierre_aprobado === false ? '❌ Cierre rechazado' : 'Pendiente'} />
        {h.motivo_rechazo && <Row label="Motivo de rechazo" value={<span className="text-[#A32D2D]">{h.motivo_rechazo}</span>} />}
        <Row label="Fecha efectiva de cierre" value={fmtFechaHora(h.fecha_cierre)} />
        <Row label="Tiempo detección → cierre" value={h.dias_cierre != null ? `${h.dias_cierre} días` : '—'} />
      </Card>

      <Card>
        <SectionTitle>Firmas y validaciones</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['elaboracion', 'recepcion', 'ejecucion', 'verificacion'] as Firma['tipo'][]).map((t) => {
            const f = ultima(t);
            return (
              <div key={t} className="border border-[#E3E1D9] rounded-lg p-2 text-center">
                <div className="h-14 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f?.url ? <img src={f.url} alt="firma" className="max-h-14 max-w-full object-contain" /> : f ? <span className="text-[#3B6D11] text-xs">✔ Validado</span> : <span className="text-[#C9C7BF] text-xs">Pendiente</span>}
                </div>
                <div className="border-t border-[#E3E1D9] mt-1 pt-1 text-[11px] font-semibold">{f?.nombre || '—'}</div>
                <div className="text-[10px] text-[#5F5E5A]">{FIRMA_LABEL[t]}</div>
                {f && <div className="text-[10px] text-[#9C9A92]">{fmtFechaHora(f.creado_en)}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Historial de cambios de estado</SectionTitle>
        <div className="space-y-2">
          {(audit || []).map((a) => (
            <div key={a.id} className="text-xs border-l-2 border-[#185FA5] pl-2">
              <div className="text-[#5F5E5A]">{fmtFechaHora(a.creado_en)} · {a.perfiles?.nombre || 'Sistema'}</div>
              <div className="font-semibold">{ACCION_LABEL[a.accion] || a.accion}{a.estado_anterior && a.estado_snapshot && a.estado_anterior !== a.estado_snapshot ? ` (${a.estado_anterior} → ${a.estado_snapshot})` : ''}</div>
              {a.detalle && <div>{a.detalle}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Historial de notificaciones</SectionTitle>
        {(notifs || []).length === 0 && <p className="text-xs text-[#5F5E5A]">Sin notificaciones enviadas.</p>}
        <div className="space-y-1">
          {(notifs || []).map((n) => {
            const err = String(n.estado).startsWith('error');
            return (
              <div key={n.id} className="text-[11px] flex justify-between gap-2 border-b border-[#F1EFE8] py-1">
                <span>{n.canal === 'email' ? '✉️' : '💬'} {n.dest?.nombre || n.destinatario_email} · {n.evento || '—'}</span>
                <span className={err ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}>{err ? n.estado : 'Enviado'} · {fmtFechaHora(n.creado_en)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Fotos({ titulo, fotos }: { titulo: string; fotos: { id: string; url: string; descripcion: string | null; creado_en: string }[] }) {
  if (!fotos.length) return (
    <div className="mt-2"><div className="text-[11px] font-semibold text-[#5F5E5A]">{titulo}</div><p className="text-xs text-[#9C9A92]">Sin fotos</p></div>
  );
  return (
    <div className="mt-2">
      <div className="text-[11px] font-semibold text-[#5F5E5A] mb-1">{titulo} ({fotos.length})</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fotos.map((f) => (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.descripcion || titulo} className="w-full aspect-[4/3] object-cover rounded-lg bg-[#F1EFE8]" />
            <div className="text-[10px] text-[#5F5E5A] mt-0.5">{f.descripcion || '—'} · {fmtFecha(f.creado_en)}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
