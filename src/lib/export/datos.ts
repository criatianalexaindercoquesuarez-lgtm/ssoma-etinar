import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditoriaItem, Evidencia, Firma, HallazgoVista } from '../types';
import { calcularIndicadores, contarInspecciones, obtenerInspeccion, obtenerMatriz, type Filtros } from '../matriz';

export interface Foto { descripcion: string | null; fecha: string; url: string; img: { data: Buffer; format: 'jpg' | 'png' } | null }
export interface FirmaReporte extends Firma { img: { data: Buffer; format: 'jpg' | 'png' } | null }
export interface DetalleHallazgo {
  h: HallazgoVista;
  antes: Foto[];
  avances: Foto[];
  despues: Foto[];
  firmas: FirmaReporte[];
  historial: (AuditoriaItem & { usuario: string | null })[];
  notificaciones: { creado_en: string; canal: string; evento: string | null; estado: string; destinatario: string | null }[];
}

const enLotes = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function descargar(db: SupabaseClient, path: string) {
  try {
    const { data } = await db.storage.from('evidencias').download(path);
    if (!data) return null;
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf[0] === 0xff && buf[1] === 0xd8) return { data: buf, format: 'jpg' as const };
    if (buf[0] === 0x89 && buf[1] === 0x50) return { data: buf, format: 'png' as const };
    return null; // HEIC/WebP: el PDF muestra el enlace en lugar de la foto
  } catch {
    return null;
  }
}

/** Reúne hallazgos + evidencias + firmas + historial para Excel y PDF. */
export async function cargarDetalles(
  db: SupabaseClient, hs: HallazgoVista[], opts: { fotos: boolean; maxFotos?: number }
): Promise<DetalleHallazgo[]> {
  const ids = hs.map((h) => h.id);
  const ev: Evidencia[] = [], fi: Firma[] = [], au: (AuditoriaItem & { perfiles: { nombre: string } | null })[] = [];
  const no: { hallazgo_id: string; creado_en: string; canal: string; evento: string | null; estado: string; destinatario_email: string | null; dest: { nombre: string } | null }[] = [];
  for (const lote of enLotes(ids, 80)) {
    const [a, b, c, d] = await Promise.all([
      db.from('evidencias').select('*').in('hallazgo_id', lote).eq('eliminado', false).order('creado_en'),
      db.from('firmas').select('*').in('hallazgo_id', lote).order('creado_en'),
      db.from('auditoria').select('*, perfiles(nombre)').in('hallazgo_id', lote).order('creado_en'),
      db.from('notificaciones').select('hallazgo_id,creado_en,canal,evento,estado,destinatario_email,dest:perfiles!notificaciones_destinatario_id_fkey(nombre)')
        .in('hallazgo_id', lote).neq('canal', 'sistema').order('creado_en'),
    ]);
    ev.push(...((a.data || []) as Evidencia[]));
    fi.push(...((b.data || []) as Firma[]));
    au.push(...((c.data || []) as typeof au));
    no.push(...((d.data || []) as unknown as typeof no));
  }
  const url = (p: string) => db.storage.from('evidencias').getPublicUrl(p).data.publicUrl;
  const max = opts.maxFotos ?? 6;

  return Promise.all(hs.map(async (h) => {
    const mias = ev.filter((e) => e.hallazgo_id === h.id);
    const fotos = async (tipo: string) => Promise.all(
      mias.filter((e) => e.tipo === tipo).slice(0, max).map(async (e) => ({
        descripcion: e.descripcion, fecha: e.creado_en, url: url(e.storage_path),
        img: opts.fotos ? await descargar(db, e.storage_path) : null,
      })));
    const firmas = await Promise.all(fi.filter((f) => f.hallazgo_id === h.id).map(async (f) => ({
      ...f, img: opts.fotos && f.firma_path ? await descargar(db, f.firma_path) : null,
    })));
    return {
      h,
      antes: await fotos('apertura'),
      avances: await fotos('avance'),
      despues: await fotos('cierre'),
      firmas,
      historial: au.filter((x) => x.hallazgo_id === h.id).map((x) => ({ ...x, usuario: x.perfiles?.nombre || null })),
      notificaciones: no.filter((x) => x.hallazgo_id === h.id).map((x) => ({
        creado_en: x.creado_en, canal: x.canal, evento: x.evento, estado: x.estado, destinatario: x.dest?.nombre || x.destinatario_email,
      })),
    };
  }));
}

export async function cargarReporteMatriz(db: SupabaseClient, f: Filtros, fotos: boolean) {
  const hs = await obtenerMatriz(db, f);
  const [detalles, nInsp, inspeccion] = await Promise.all([
    cargarDetalles(db, hs, { fotos, maxFotos: fotos ? 2 : 20 }),
    contarInspecciones(db, f),
    obtenerInspeccion(db, f.inspeccion),
  ]);
  const { data: proyecto } = f.obra ? await db.from('proyectos').select('nombre,codigo').eq('id', f.obra).single() : { data: null };
  const { data: resp } = f.responsable ? await db.from('perfiles').select('nombre').eq('id', f.responsable).single() : { data: null };
  return { hs, detalles, inspeccion, proyecto, responsableNombre: resp?.nombre as string | undefined, indicadores: calcularIndicadores(hs, nInsp) };
}
export type ReporteMatriz = Awaited<ReturnType<typeof cargarReporteMatriz>>;

export function describirFiltros(f: Filtros, r: Pick<ReporteMatriz, 'inspeccion' | 'proyecto' | 'responsableNombre'>) {
  const p: string[] = [];
  if (r.inspeccion) p.push(`Inspección ${r.inspeccion.codigo}`);
  if (r.proyecto) p.push(`Obra: ${r.proyecto.nombre}`);
  if (f.desde || f.hasta) p.push(`Periodo: ${f.desde || '...'} a ${f.hasta || '...'}`);
  if (r.responsableNombre) p.push(`Responsable: ${r.responsableNombre}`);
  if (f.nivel) p.push(`Nivel de riesgo: ${f.nivel}`);
  if (f.estado) p.push(`Estado: ${f.estado}`);
  return p.length ? p.join(' | ') : 'Todas las obras, todos los hallazgos';
}

export async function cargarLogo(origin: string) {
  try {
    const res = await fetch(`${origin}/logo-etinar.png`, { cache: 'force-cache' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf[0] === 0x89 && buf[1] === 0x50 ? { data: buf, format: 'png' as const } : null;
  } catch {
    return null;
  }
}
