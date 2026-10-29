import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { notificarEvento, EventoNotificacion } from './notificaciones';
import type { Hallazgo, Perfil } from './types';
import { esSST, puede, type Accion } from './permisos';

/**
 * Motor de seguimiento y cierre — común a todas las modalidades de inspección.
 *   pendiente → en_proceso → en_verificacion → cerrado
 *                    ↑______ rechazo SST ______|
 * "vencido" no se guarda: se calcula (fecha_limite < hoy y no cerrado).
 */

export async function getSesion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single<Perfil>();
  if (!perfil) return null;
  return { supabase, user, perfil };
}

export { esSST, puede, type Accion };

export interface PayloadAccion {
  comentario?: string;
  cumplimiento?: number;
  fecha_ejecucion?: string;
  acciones_implementadas?: string;
  observaciones_responsable?: string;
  verificacion_resultado?: string;
  motivo_rechazo?: string;
  nueva_fecha_limite?: string;
  responsable_id?: string;
  verificador_id?: string;
  fecha_limite?: string;
  /** Evidencias ya subidas a Storage por el navegador */
  evidencias?: { storage_path: string; descripcion?: string }[];
  /** Firma manuscrita opcional (PNG en base64 dataURL) */
  firma_png?: string;
}

async function guardarFirma(db: SupabaseClient, h: Hallazgo, p: Perfil, tipo: string, png?: string) {
  let firma_path: string | null = null;
  if (png && png.startsWith('data:image/png;base64,')) {
    const bytes = Buffer.from(png.split(',')[1], 'base64');
    if (bytes.length < 400_000) {
      const path = `firmas/${h.id}/${tipo}-${Date.now()}.png`;
      const { error } = await db.storage.from('evidencias').upload(path, bytes, { contentType: 'image/png' });
      if (!error) firma_path = path;
    }
  }
  await db.from('firmas').insert({
    hallazgo_id: h.id, tipo, usuario_id: p.id, nombre: p.nombre,
    cargo: p.cargo || null, rol: p.rol, firma_path,
  });
}

async function registrarEvidencias(db: SupabaseClient, h: Hallazgo, p: Perfil, tipo: string, ev?: PayloadAccion['evidencias']) {
  const filas = (ev || [])
    .filter((e) => e.storage_path?.startsWith(`${h.id}/`))
    .map((e) => ({ hallazgo_id: h.id, storage_path: e.storage_path, descripcion: e.descripcion || null, tipo, subido_por: p.id }));
  if (filas.length) {
    const { error } = await db.from('evidencias').insert(filas);
    if (error) throw new Error('No se pudo registrar la evidencia: ' + error.message);
  }
  return filas.length;
}

export async function ejecutarAccion(hallazgoId: string, accion: Accion, body: PayloadAccion) {
  const s = await getSesion();
  if (!s) return { status: 401, error: 'No autenticado' };
  const { supabase: db, perfil: p } = s;

  const { data: h } = await db.from('hallazgos').select('*').eq('id', hallazgoId).single<Hallazgo>();
  if (!h) return { status: 404, error: 'Hallazgo no encontrado' };
  if (!puede(accion, h, p)) return { status: 403, error: 'No tiene permiso para esta acción en el estado actual' };

  const cambios: Partial<Hallazgo> = {};
  let detalle = body.comentario?.trim() || '';
  let evento: EventoNotificacion | null = null;
  let extra: string | undefined;

  try {
    switch (accion) {
      case 'recibir':
        cambios.recibido_en = new Date().toISOString();
        if (h.estado === 'pendiente') cambios.estado = 'en_proceso';
        await guardarFirma(db, h, p, 'recepcion', body.firma_png);
        detalle = detalle || `Recepción firmada por ${p.nombre}`;
        break;

      case 'avance': {
        if (!detalle) return { status: 400, error: 'Escriba un comentario del avance' };
        const n = await registrarEvidencias(db, h, p, 'avance', body.evidencias);
        cambios.estado = 'en_proceso';
        if (typeof body.cumplimiento === 'number') cambios.cumplimiento = Math.max(0, Math.min(99, body.cumplimiento));
        detalle += n ? ` (${n} foto/s)` : '';
        break;
      }

      case 'enviar_verificacion': {
        if (!body.acciones_implementadas?.trim()) return { status: 400, error: 'Describa las acciones implementadas' };
        if (!body.fecha_ejecucion) return { status: 400, error: 'Indique la fecha de ejecución de la medida' };
        const n = await registrarEvidencias(db, h, p, 'cierre', body.evidencias);
        const { count } = await db.from('evidencias').select('id', { count: 'exact', head: true })
          .eq('hallazgo_id', h.id).eq('tipo', 'cierre').eq('eliminado', false);
        if (!count) return { status: 400, error: 'Cargue al menos una fotografía de evidencia del cumplimiento (después)' };
        Object.assign(cambios, {
          estado: 'en_verificacion', cumplimiento: 100,
          fecha_ejecucion: body.fecha_ejecucion,
          acciones_implementadas: body.acciones_implementadas.trim(),
          observaciones_responsable: body.observaciones_responsable?.trim() || null,
          motivo_rechazo: null, cierre_aprobado: null,
        });
        await guardarFirma(db, h, p, 'ejecucion', body.firma_png);
        detalle = `Evidencia enviada a verificación (${n} foto/s nuevas). ${body.acciones_implementadas.trim()}`;
        evento = 'evidencia_cargada';
        break;
      }

      case 'aprobar':
        if (!body.verificacion_resultado?.trim()) return { status: 400, error: 'Registre el resultado de la verificación' };
        Object.assign(cambios, {
          estado: 'cerrado', cierre_aprobado: true, cumplimiento: 100,
          verificacion_resultado: body.verificacion_resultado.trim(),
          fecha_cierre: new Date().toISOString(),
          verificador_id: h.verificador_id || p.id,
        });
        await guardarFirma(db, h, p, 'verificacion', body.firma_png);
        detalle = `Cierre aprobado: ${body.verificacion_resultado.trim()}`;
        evento = 'cierre_aprobado';
        extra = body.verificacion_resultado.trim();
        break;

      case 'rechazar':
        if (!body.motivo_rechazo?.trim()) return { status: 400, error: 'Indique el motivo del rechazo' };
        Object.assign(cambios, {
          estado: 'en_proceso', cierre_aprobado: false,
          motivo_rechazo: body.motivo_rechazo.trim(),
          verificacion_resultado: body.verificacion_resultado?.trim() || 'No conforme',
          ...(body.nueva_fecha_limite ? { fecha_limite: body.nueva_fecha_limite } : {}),
        });
        detalle = `Cierre rechazado: ${body.motivo_rechazo.trim()}`;
        evento = 'cierre_rechazado';
        extra = `Motivo del rechazo: ${body.motivo_rechazo.trim()}`;
        break;

      case 'reasignar':
        if (body.responsable_id) cambios.responsable_id = body.responsable_id;
        if (body.verificador_id) cambios.verificador_id = body.verificador_id;
        if (body.fecha_limite) cambios.fecha_limite = body.fecha_limite;
        if (!Object.keys(cambios).length) return { status: 400, error: 'Sin cambios' };
        cambios.fecha_asignacion = new Date().toISOString().slice(0, 10);
        detalle = detalle || 'Reasignación de responsable / plazo';
        evento = 'asignado';
        break;

      case 'notificar':
        evento = h.estado === 'en_verificacion' ? 'evidencia_cargada' : 'recordatorio';
        detalle = 'Notificación manual enviada';
        break;
    }
  } catch (e) {
    return { status: 500, error: (e as Error).message };
  }

  if (Object.keys(cambios).length) {
    const { error } = await db.from('hallazgos').update(cambios).eq('id', h.id);
    if (error) return { status: 400, error: 'No se pudo actualizar: ' + error.message };
  }

  await db.from('auditoria').insert({
    hallazgo_id: h.id,
    accion,
    usuario_id: p.id,
    detalle,
    estado_anterior: h.estado,
    estado_snapshot: cambios.estado || h.estado,
    cumplimiento_snapshot: cambios.cumplimiento ?? h.cumplimiento,
    datos: { ...body, firma_png: body.firma_png ? '[firma]' : undefined },
  });

  let notificaciones = undefined;
  if (evento) {
    const notifDb = createAdminClient() || db;
    notificaciones = await notificarEvento(notifDb, h.id, evento, { actorId: p.id, extra });
  }
  return { status: 200, ok: true, notificaciones };
}

/** Alta de hallazgo (usado por la API de creación). */
export async function crearHallazgo(body: Record<string, unknown>) {
  const s = await getSesion();
  if (!s) return { status: 401, error: 'No autenticado' };
  const { supabase: db, perfil: p } = s;

  const req = ['id', 'inspeccion_id', 'descripcion', 'accion_correctiva', 'responsable_id', 'fecha_limite', 'area'];
  for (const k of req) if (!body[k]) return { status: 400, error: `Falta el campo: ${k}` };

  const { data: insp } = await db.from('inspecciones').select('*').eq('id', body.inspeccion_id as string).single();
  if (!insp) return { status: 400, error: 'Inspección no encontrada' };

  const permitido = [
    'id', 'inspeccion_id', 'area', 'ubicacion', 'nivel', 'frente', 'contratista', 'descripcion', 'tipo_desviacion',
    'peligro', 'factor_riesgo', 'consecuencias', 'trabajadores_expuestos', 'personas_afectadas', 'nd', 'ne', 'nc',
    'accion_inmediata', 'accion_correctiva', 'medida_preventiva', 'responsable_id', 'verificador_id',
    'fecha_limite', 'causas', 'normativa', 'observaciones',
  ];
  const fila: Record<string, unknown> = { proyecto_id: insp.proyecto_id, creado_por: p.id, estado: 'pendiente' };
  for (const k of permitido) if (body[k] !== undefined && body[k] !== '') fila[k] = body[k];
  fila.contratista = fila.contratista || insp.contratista;
  fila.codigo = ''; // lo genera la base de datos: H-<OBRA>-0001

  const { data: nuevo, error } = await db.from('hallazgos').insert(fila).select('*').single<Hallazgo>();
  if (error || !nuevo) return { status: 400, error: 'Error al guardar: ' + error?.message };

  await registrarEvidencias(db, nuevo, p, 'apertura', body.evidencias as PayloadAccion['evidencias']);
  await guardarFirma(db, nuevo, p, 'elaboracion', body.firma_png as string | undefined);
  await db.from('auditoria').insert({
    hallazgo_id: nuevo.id, accion: 'crear', usuario_id: p.id, detalle: 'Hallazgo registrado y asignado',
    estado_snapshot: 'pendiente', cumplimiento_snapshot: 0,
  });

  const notifDb = createAdminClient() || db;
  const notificaciones = await notificarEvento(notifDb, nuevo.id, 'registrado', { actorId: p.id });
  return { status: 200, ok: true, id: nuevo.id, codigo: nuevo.codigo, notificaciones };
}
