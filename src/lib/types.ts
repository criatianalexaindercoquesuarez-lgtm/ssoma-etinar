export type RolUsuario =
  | 'admin' | 'coordinador_sst' | 'tecnico_sso' | 'jefe_obra' | 'residente'
  | 'contratista' | 'bodeguero' | 'director' | 'auditor';
export type Criticidad = 'critico' | 'moderado' | 'bajo';
export type EstadoHallazgo = 'pendiente' | 'en_proceso' | 'en_verificacion' | 'cerrado';
export type EstadoEfectivo = EstadoHallazgo | 'vencido';
export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';
export type NivelRiesgo = 'I' | 'II' | 'III' | 'IV';

export const ROL_LABEL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  coordinador_sst: 'Coordinador SST',
  tecnico_sso: 'Técnico SSO / Inspector',
  jefe_obra: 'Jefe de Obra',
  residente: 'Residente de Obra',
  contratista: 'Contratista',
  bodeguero: 'Bodeguero',
  director: 'Director',
  auditor: 'Auditor / Cliente',
};

/** Roles que validan y aprueban cierres. */
export const ROLES_SST: RolUsuario[] = ['admin', 'coordinador_sst', 'tecnico_sso'];
/** Roles que pueden firmar la recepción / ejecución en nombre de la obra. */
export const ROLES_OBRA: RolUsuario[] = ['residente', 'jefe_obra', 'coordinador_sst'];

export const ESTADO_LABEL: Record<EstadoEfectivo, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  en_verificacion: 'En verificación',
  vencido: 'Vencido',
  cerrado: 'Cerrado',
};
export const ESTADO_COLOR: Record<EstadoEfectivo, { bg: string; fg: string }> = {
  pendiente: { bg: '#F1EFE8', fg: '#5F5E5A' },
  en_proceso: { bg: '#FAEEDA', fg: '#854F0B' },
  en_verificacion: { bg: '#E6F1FB', fg: '#0C447C' },
  vencido: { bg: '#FCEBEB', fg: '#A32D2D' },
  cerrado: { bg: '#EAF3DE', fg: '#3B6D11' },
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja',
};
export const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  critica: '#A32D2D', alta: '#E24B4A', media: '#EF9F27', baja: '#639922',
};

export const TIPO_DESVIACION = [
  { id: 'condicion_insegura', label: 'Condición insegura' },
  { id: 'acto_inseguro', label: 'Acto inseguro' },
];

export const CAUSAS = [
  { id: 'acto_inseguro', label: 'Acto inseguro' },
  { id: 'condicion_insegura', label: 'Condición insegura' },
  { id: 'falta_supervision', label: 'Falta de supervisión' },
  { id: 'incumplimiento_procedimiento', label: 'Incumplimiento procedimiento' },
  { id: 'falta_capacitacion', label: 'Falta de capacitación' },
  { id: 'falta_control_operacional', label: 'Falta de control operacional' },
];

export const NORMATIVAS = [
  { id: 'decreto_2393', label: 'Decreto Ejecutivo 2393' },
  { id: 'resolucion_513', label: 'Resolución C.D. 513 (SART)' },
  { id: 'decision_584', label: 'Decisión 584 CAN' },
  { id: 'resolucion_957', label: 'Resolución 957' },
  { id: 'nte_inen', label: 'NTE INEN aplicable' },
  { id: 'requisito_cliente', label: 'Requisito del cliente' },
  { id: 'guia_bid', label: 'Guía BID / OP-703' },
  { id: 'reglamento_interno', label: 'Reglamento interno ETINAR' },
];

export const AREAS = [
  'Estructura / Civil', 'Eléctrico', 'Andamios / Escaleras', 'Excavaciones', 'Trabajo en alturas',
  'Bodega', 'Oficinas', 'Áreas exteriores', 'Mecánica / Equipos', 'Accesos y circulación',
];

export interface Perfil {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: RolUsuario;
  cargo?: string | null;
  empresa?: string | null;
  proyecto_id: string | null;
}

export interface Proyecto { id: string; nombre: string; codigo: string | null; ubicacion?: string | null }

export interface Inspeccion {
  id: string;
  proyecto_id: string;
  modalidad: string;
  codigo: string;
  fecha_hora: string;
  inspector_id: string | null;
  area: string | null;
  ubicacion: string | null;
  nivel: string | null;
  frente: string | null;
  contratista: string | null;
  observaciones: string | null;
  creado_en: string;
}

export interface Hallazgo {
  id: string;
  proyecto_id: string;
  inspeccion_id: string | null;
  codigo: string;
  area: string;
  ubicacion: string | null;
  nivel: string | null;
  frente: string | null;
  contratista: string | null;
  descripcion: string;
  tipo_desviacion: string | null;
  peligro: string | null;
  factor_riesgo: string | null;
  consecuencias: string | null;
  trabajadores_expuestos: number | null;
  personas_afectadas: number | null;
  nd: number | null; ne: number | null; nc: number | null;
  np: number | null; nr: number | null;
  nivel_riesgo: NivelRiesgo | null;
  prioridad: Prioridad | null;
  accion_inmediata: string | null;
  accion_correctiva: string;
  medida_preventiva: string | null;
  criticidad: Criticidad;
  estado: EstadoHallazgo;
  cumplimiento: number;
  causas: string[];
  normativa: string[];
  responsable_id: string | null;
  verificador_id: string | null;
  creado_por: string | null;
  fecha_asignacion: string;
  fecha_limite: string;
  recibido_en: string | null;
  fecha_ejecucion: string | null;
  acciones_implementadas: string | null;
  observaciones_responsable: string | null;
  verificacion_resultado: string | null;
  cierre_aprobado: boolean | null;
  motivo_rechazo: string | null;
  fecha_cierre: string | null;
  reincidente_de: string | null;
  observaciones: string | null;
  eliminado: boolean;
  creado_en: string;
  actualizado_en: string;
}

/** Fila de la vista v_hallazgos (hallazgo + datos de obra, inspección y personas). */
export interface HallazgoVista extends Hallazgo {
  obra_nombre: string;
  obra_codigo: string | null;
  inspeccion_codigo: string | null;
  inspeccion_fecha: string | null;
  modalidad: string | null;
  inspector_nombre: string | null;
  responsable_nombre: string | null;
  responsable_email: string | null;
  responsable_cargo: string | null;
  verificador_nombre: string | null;
  verificador_cargo: string | null;
  creador_nombre: string | null;
  estado_efectivo: EstadoEfectivo;
  dias_cierre: number | null;
  dias_vencido: number;
  tiene_evidencia_cierre: boolean;
  total_evidencias: number;
}

export interface Evidencia {
  id: string;
  hallazgo_id: string;
  storage_path: string;
  tipo: 'apertura' | 'avance' | 'cierre';
  descripcion: string | null;
  subido_por: string | null;
  creado_en: string;
}

export interface AuditoriaItem {
  id: string;
  hallazgo_id: string;
  accion: string;
  usuario_id: string | null;
  detalle: string | null;
  estado_anterior: string | null;
  estado_snapshot: string | null;
  cumplimiento_snapshot: number | null;
  creado_en: string;
}

export interface Firma {
  id: string;
  hallazgo_id: string | null;
  inspeccion_id: string | null;
  tipo: 'elaboracion' | 'recepcion' | 'ejecucion' | 'verificacion';
  usuario_id: string | null;
  nombre: string;
  cargo: string | null;
  rol: string | null;
  firma_path: string | null;
  creado_en: string;
}

export const FIRMA_LABEL: Record<Firma['tipo'], string> = {
  elaboracion: 'Elaborado por (Inspector SST)',
  recepcion: 'Recibido por (Residente / Jefe de Obra)',
  ejecucion: 'Ejecutado por (Residente / Jefe de Obra)',
  verificacion: 'Verificado y aprobado (Coordinador SST)',
};

export interface Notificacion {
  id: string;
  hallazgo_id: string | null;
  destinatario_id: string | null;
  canal: 'email' | 'whatsapp' | 'sistema';
  estado: string;
  evento: string | null;
  asunto: string | null;
  cuerpo: string | null;
  leida: boolean;
  destinatario_email: string | null;
  creado_en: string;
}

export const ACCION_LABEL: Record<string, string> = {
  crear: 'Hallazgo registrado',
  recibir: 'Recepción firmada por el responsable',
  avance: 'Avance registrado',
  enviar_verificacion: 'Evidencia enviada a verificación SST',
  aprobar: 'Cierre aprobado por SST',
  rechazar: 'Cierre rechazado por SST',
  reasignar: 'Responsable / plazo reasignado',
  cerrar: 'Cerrado',
  editar: 'Editado',
  archivar: 'Archivado',
  notificar: 'Notificación enviada',
};

export const fmtFecha = (d?: string | null) =>
  d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : '—';
export const fmtFechaHora = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'short', timeStyle: 'short' }) : '—';
