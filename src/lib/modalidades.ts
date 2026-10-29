/**
 * Modalidades de inspección. Para agregar una nueva (p. ej. inspección planeada, auditoría,
 * inspección de equipos), basta con añadirla aquí: hallazgos, seguimiento, evidencias,
 * notificaciones, cierre, Excel y PDF se reutilizan sin cambios.
 */
export const MODALIDADES = [
  { id: 'no_planeada', label: 'Inspección no planeada', activa: true },
  { id: 'planeada', label: 'Inspección planeada', activa: false },
  { id: 'auditoria', label: 'Auditoría / verificación de cumplimiento', activa: false },
];
export const modalidadLabel = (id?: string | null) => MODALIDADES.find((m) => m.id === id)?.label || id || '—';
