export type RolUsuario = 'admin' | 'tecnico_sso' | 'residente' | 'bodeguero' | 'director' | 'auditor';
export type Criticidad = 'critico' | 'moderado' | 'bajo';
export type EstadoHallazgo = 'abierto' | 'en_proceso' | 'cerrado';

export const ROL_LABEL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  tecnico_sso: 'Técnico SSO',
  residente: 'Residente de Obra',
  bodeguero: 'Bodeguero',
  director: 'Director',
  auditor: 'Auditor / Cliente',
};

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

export interface Perfil {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: RolUsuario;
  proyecto_id: string | null;
}

export interface Hallazgo {
  id: string;
  proyecto_id: string;
  codigo: string;
  area: string;
  descripcion: string;
  accion_correctiva: string;
  criticidad: Criticidad;
  estado: EstadoHallazgo;
  cumplimiento: number;
  causas: string[];
  normativa: string[];
  responsable_id: string | null;
  fecha_limite: string;
  observaciones: string | null;
  eliminado: boolean;
  creado_en: string;
}

export interface Evidencia {
  id: string;
  hallazgo_id: string;
  storage_path: string;
  tipo: string;
  creado_en: string;
}

export interface AuditoriaItem {
  id: string;
  hallazgo_id: string;
  accion: 'crear' | 'avance' | 'cerrar' | 'editar' | 'archivar';
  usuario_id: string | null;
  detalle: string | null;
  creado_en: string;
}
