import { ROLES_OBRA, ROLES_SST, type Hallazgo, type Perfil, type RolUsuario } from './types';

export type Accion =
  | 'recibir' | 'avance' | 'enviar_verificacion' | 'aprobar' | 'rechazar' | 'reasignar' | 'notificar';

export const esSST = (rol: RolUsuario) => ROLES_SST.includes(rol);

/**
 * Reglas de quién puede hacer qué (se validan en el servidor y en la base de datos).
 *  - Recibir / avance / evidencia: el responsable asignado, o Residente, Jefe de Obra o Coordinador SST.
 *  - Aprobar / rechazar cierre: el verificador asignado o personal SST.
 *  - Reasignar responsable o plazo: SST o Jefe de Obra.
 */
export function puede(accion: Accion, h: Pick<Hallazgo, 'estado' | 'responsable_id' | 'verificador_id'>, p: Pick<Perfil, 'id' | 'rol'>): boolean {
  const esResp = h.responsable_id === p.id;
  const esVerif = h.verificador_id === p.id;
  const obra = ROLES_OBRA.includes(p.rol);
  switch (accion) {
    case 'recibir':
    case 'avance':
    case 'enviar_verificacion':
      return h.estado !== 'cerrado' && h.estado !== 'en_verificacion' && (esResp || obra || esSST(p.rol));
    case 'aprobar':
    case 'rechazar':
      return h.estado === 'en_verificacion' && (esVerif || esSST(p.rol));
    case 'reasignar':
      return h.estado !== 'cerrado' && (esSST(p.rol) || p.rol === 'jefe_obra');
    case 'notificar':
      return h.estado !== 'cerrado';
  }
}
