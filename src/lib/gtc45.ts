// Metodología GTC-45 (Guía Técnica Colombiana 45, 2012) para valoración del riesgo.
// NP = ND × NE   ·   NR = NP × NC
// El cálculo oficial se hace también en la base de datos (trigger), esto es para la vista previa.
import type { NivelRiesgo, Prioridad } from './types';

export const ND_OPCIONES = [
  { valor: 10, label: 'Muy alto (10)', ayuda: 'Peligros que determinan como posible la generación de incidentes; medidas preventivas inexistentes o ineficaces.' },
  { valor: 6, label: 'Alto (6)', ayuda: 'Peligros que pueden dar lugar a consecuencias significativas; eficacia de las medidas baja.' },
  { valor: 2, label: 'Medio (2)', ayuda: 'Peligros con consecuencias poco significativas o de menor importancia; eficacia moderada.' },
  { valor: 0, label: 'Bajo (0)', ayuda: 'No se ha detectado anomalía destacable o la eficacia de las medidas es alta.' },
];

export const NE_OPCIONES = [
  { valor: 4, label: 'Continua (4)', ayuda: 'Varias veces durante la jornada, por tiempos prolongados.' },
  { valor: 3, label: 'Frecuente (3)', ayuda: 'Varias veces durante la jornada, por tiempos cortos.' },
  { valor: 2, label: 'Ocasional (2)', ayuda: 'Alguna vez durante la jornada, por un periodo corto.' },
  { valor: 1, label: 'Esporádica (1)', ayuda: 'Se presenta de manera eventual.' },
];

export const NC_OPCIONES = [
  { valor: 100, label: 'Mortal o catastrófico (100)', ayuda: 'Muerte.' },
  { valor: 60, label: 'Muy grave (60)', ayuda: 'Lesiones o enfermedades graves irreparables (incapacidad permanente).' },
  { valor: 25, label: 'Grave (25)', ayuda: 'Lesiones o enfermedades con incapacidad laboral temporal.' },
  { valor: 10, label: 'Leve (10)', ayuda: 'Lesiones o enfermedades que no requieren incapacidad.' },
];

export const FACTORES_RIESGO = [
  { id: 'condiciones_seguridad', label: 'Condiciones de seguridad (mecánico, eléctrico, locativo, alturas, tránsito)' },
  { id: 'fisico', label: 'Físico (ruido, iluminación, vibración, temperatura, radiación)' },
  { id: 'quimico', label: 'Químico (polvos, gases, vapores, líquidos)' },
  { id: 'biologico', label: 'Biológico' },
  { id: 'biomecanico', label: 'Biomecánico (postura, esfuerzo, manipulación de cargas)' },
  { id: 'psicosocial', label: 'Psicosocial' },
  { id: 'fenomenos_naturales', label: 'Fenómenos naturales' },
];
export const factorLabel = (id?: string | null) =>
  FACTORES_RIESGO.find((f) => f.id === id)?.label.split(' (')[0] || id || '—';

export const NIVEL_RIESGO_INFO: Record<NivelRiesgo, { rango: string; significado: string; prioridad: Prioridad; plazoDias: number }> = {
  I: { rango: '600 – 4000', significado: 'Situación crítica. Suspender actividades hasta controlar el riesgo.', prioridad: 'critica', plazoDias: 1 },
  II: { rango: '150 – 500', significado: 'Corregir y adoptar medidas de control de inmediato.', prioridad: 'alta', plazoDias: 3 },
  III: { rango: '40 – 120', significado: 'Mejorar si es posible. Justificar la intervención y su rentabilidad.', prioridad: 'media', plazoDias: 7 },
  IV: { rango: '≤ 20', significado: 'Mantener las medidas de control existentes.', prioridad: 'baja', plazoDias: 15 },
};

export function calcularGTC45(nd?: number | null, ne?: number | null, nc?: number | null) {
  if (nd == null || ne == null || nc == null) return null;
  const np = nd * ne;
  const nr = np * nc;
  const nivel: NivelRiesgo = nr >= 600 ? 'I' : nr >= 150 ? 'II' : nr >= 40 ? 'III' : 'IV';
  const interpNP = np >= 24 ? 'Muy alto' : np >= 10 ? 'Alto' : np >= 6 ? 'Medio' : 'Bajo';
  return { np, nr, nivel, interpNP, ...NIVEL_RIESGO_INFO[nivel] };
}
