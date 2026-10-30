import type { SupabaseClient } from '@supabase/supabase-js';
import type { HallazgoVista, Inspeccion } from './types';

/** Filtros comunes a la pantalla Matriz, Excel, PDF y reportes. */
export interface Filtros {
  obra?: string;
  inspeccion?: string;
  desde?: string; // yyyy-mm-dd (fecha de detección)
  hasta?: string;
  responsable?: string;
  nivel?: string; // I..IV
  prioridad?: string;
  estado?: string; // pendiente | en_proceso | en_verificacion | vencido | cerrado
  modalidad?: string;
}

export const FILTRO_KEYS: (keyof Filtros)[] = ['obra', 'inspeccion', 'desde', 'hasta', 'responsable', 'nivel', 'prioridad', 'estado', 'modalidad'];

export function leerFiltros(sp: URLSearchParams | Record<string, string | string[] | undefined>): Filtros {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  const f: Filtros = {};
  FILTRO_KEYS.forEach((k) => { const v = get(k); if (v) f[k] = v; });
  return f;
}

export function filtrosAQuery(f: Filtros) {
  const q = new URLSearchParams();
  FILTRO_KEYS.forEach((k) => { if (f[k]) q.set(k, f[k]!); });
  return q.toString();
}

export async function obtenerMatriz(db: SupabaseClient, f: Filtros): Promise<HallazgoVista[]> {
  let q = db.from('v_hallazgos').select('*');
  if (f.obra) q = q.eq('proyecto_id', f.obra);
  if (f.inspeccion) q = q.eq('inspeccion_id', f.inspeccion);
  if (f.desde) q = q.gte('creado_en', `${f.desde}T00:00:00-05:00`);
  if (f.hasta) q = q.lte('creado_en', `${f.hasta}T23:59:59-05:00`);
  if (f.responsable) q = q.eq('responsable_id', f.responsable);
  if (f.nivel) q = q.eq('nivel_riesgo', f.nivel);
  if (f.prioridad) q = q.eq('prioridad', f.prioridad);
  if (f.estado) q = q.eq('estado_efectivo', f.estado);
  if (f.modalidad) q = q.eq('modalidad', f.modalidad);
  const { data, error } = await q.order('creado_en', { ascending: true }).limit(5000);
  if (error) throw new Error(error.message);
  return (data || []) as HallazgoVista[];
}

export async function contarInspecciones(db: SupabaseClient, f: Filtros) {
  let q = db.from('inspecciones').select('id', { count: 'exact', head: true }).eq('eliminado', false);
  if (f.obra) q = q.eq('proyecto_id', f.obra);
  if (f.inspeccion) q = q.eq('id', f.inspeccion);
  if (f.desde) q = q.gte('fecha_hora', `${f.desde}T00:00:00-05:00`);
  if (f.hasta) q = q.lte('fecha_hora', `${f.hasta}T23:59:59-05:00`);
  if (f.modalidad) q = q.eq('modalidad', f.modalidad);
  const { count } = await q;
  return count || 0;
}

export async function obtenerInspeccion(db: SupabaseClient, id?: string) {
  if (!id) return null;
  const { data } = await db.from('inspecciones')
    .select('*, proyectos(nombre,codigo), inspector:perfiles!inspecciones_inspector_id_fkey(nombre,cargo,rol)')
    .eq('id', id).single();
  return data as (Inspeccion & { proyectos: { nombre: string; codigo: string | null } | null; inspector: { nombre: string; cargo: string | null; rol: string } | null }) | null;
}

/** Indicadores consolidados (semanales, mensuales o por filtro). */
export function calcularIndicadores(hs: HallazgoVista[], totalInspecciones: number) {
  const cuenta = <K extends string>(fn: (h: HallazgoVista) => K | null | undefined) => {
    const m: Record<string, number> = {};
    hs.forEach((h) => { const k = fn(h) || 'Sin dato'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const porEstado = { pendiente: 0, en_proceso: 0, en_verificacion: 0, vencido: 0, cerrado: 0 } as Record<string, number>;
  hs.forEach((h) => { porEstado[h.estado_efectivo] = (porEstado[h.estado_efectivo] || 0) + 1; });
  const cerrados = hs.filter((h) => h.estado === 'cerrado');
  const tiempos = cerrados.map((h) => Number(h.dias_cierre)).filter((n) => !isNaN(n));
  const cerradosEnPlazo = cerrados.filter((h) => h.fecha_cierre && h.fecha_cierre.slice(0, 10) <= h.fecha_limite).length;
  const abiertos = hs.filter((h) => h.estado !== 'cerrado');
  const sinEvidencia = abiertos.filter((h) => !h.tiene_evidencia_cierre && h.estado !== 'en_verificacion').length;

  return {
    totalInspecciones,
    totalHallazgos: hs.length,
    porEstado,
    cerrados: cerrados.length,
    pctCumplimiento: hs.length ? Math.round((cerrados.length / hs.length) * 100) : 0,
    pctCierreEnPlazo: cerrados.length ? Math.round((cerradosEnPlazo / cerrados.length) * 100) : 0,
    tiempoPromedioCierre: tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : null,
    reincidentes: hs.filter((h) => h.reincidente_de).length,
    sinEvidencia,
    pendientesValidacion: porEstado.en_verificacion,
    porNivel: (['I', 'II', 'III', 'IV'] as const).map((n) => [n, hs.filter((h) => h.nivel_riesgo === n).length] as [string, number]),
    porPrioridad: (['critica', 'alta', 'media', 'baja'] as const).map((n) => [n, hs.filter((h) => h.prioridad === n).length] as [string, number]),
    porObra: cuenta((h) => h.obra_nombre),
    porResponsable: cuenta((h) => h.responsable_nombre),
    porFactor: cuenta((h) => h.factor_riesgo),
    responsablesDetalle: Object.values(hs.reduce((acc, h) => {
      const k = h.responsable_nombre || 'Sin asignar';
      acc[k] = acc[k] || { nombre: k, total: 0, cerrados: 0, vencidos: 0, abiertos: 0 };
      acc[k].total++;
      if (h.estado === 'cerrado') acc[k].cerrados++; else acc[k].abiertos++;
      if (h.estado_efectivo === 'vencido') acc[k].vencidos++;
      return acc;
    }, {} as Record<string, { nombre: string; total: number; cerrados: number; vencidos: number; abiertos: number }>))
      .sort((a, b) => b.total - a.total),
  };
}
export type Indicadores = ReturnType<typeof calcularIndicadores>;

/** Rango de un periodo semanal (lunes-domingo) o mensual que contiene `fecha`. */
export function rangoPeriodo(periodo: 'semana' | 'mes', fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  if (periodo === 'mes') {
    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { desde: iso(ini), hasta: iso(fin), etiqueta: ini.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }) };
  }
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  const ini = new Date(d); ini.setDate(d.getDate() - dow);
  const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
  return { desde: iso(ini), hasta: iso(fin), etiqueta: `Semana del ${ini.toLocaleDateString('es-EC')} al ${fin.toLocaleDateString('es-EC')}` };
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyEC = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
