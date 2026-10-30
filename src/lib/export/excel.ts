import 'server-only';
import ExcelJS from 'exceljs';
import type { ReporteMatriz } from './datos';
import { ACCION_LABEL, CAUSAS, ESTADO_LABEL, NORMATIVAS, PRIORIDAD_LABEL, TIPO_DESVIACION } from '../types';
import { factorLabel } from '../gtc45';
import { modalidadLabel } from '../modalidades';

const AZUL = 'FF185FA5';
// Excel guarda fechas sin zona horaria: se convierten a hora de Ecuador (UTC-5, sin horario de verano).
const fecha = (s?: string | null) =>
  !s ? null : s.length === 10 ? new Date(s + 'T00:00:00Z') : new Date(new Date(s).getTime() - 5 * 3600 * 1000);
const PRIOR_FILL: Record<string, string> = { Crítica: 'FFA32D2D', Alta: 'FFE24B4A', Media: 'FFEF9F27', Baja: 'FF639922' };
const ESTADO_FILL: Record<string, string> = {
  Pendiente: 'FFF1EFE8', 'En proceso': 'FFFAEEDA', 'En verificación': 'FFE6F1FB', Vencido: 'FFFCEBEB', Cerrado: 'FFEAF3DE',
};

type Col = { header: string; key: string; width: number; grupo: 'A' | 'B' | 'C' | 'D'; tipo?: 'fecha' | 'fechahora' | 'num' | 'link' };
const COLS: Col[] = [
  { header: 'N°', key: 'n', width: 5, grupo: 'A', tipo: 'num' },
  { header: 'Obra', key: 'obra', width: 22, grupo: 'A' },
  { header: 'Código proyecto', key: 'obra_codigo', width: 10, grupo: 'A' },
  { header: 'Código inspección', key: 'inspeccion', width: 18, grupo: 'A' },
  { header: 'Modalidad', key: 'modalidad', width: 16, grupo: 'A' },
  { header: 'Fecha y hora inspección', key: 'fecha_insp', width: 16, grupo: 'A', tipo: 'fechahora' },
  { header: 'Inspector', key: 'inspector', width: 18, grupo: 'A' },
  { header: 'Área', key: 'area', width: 16, grupo: 'A' },
  { header: 'Ubicación', key: 'ubicacion', width: 16, grupo: 'A' },
  { header: 'Nivel', key: 'nivel', width: 10, grupo: 'A' },
  { header: 'Frente de trabajo', key: 'frente', width: 14, grupo: 'A' },
  { header: 'Contratista', key: 'contratista', width: 16, grupo: 'A' },
  { header: 'Código hallazgo', key: 'codigo', width: 14, grupo: 'B' },
  { header: 'Fecha detección', key: 'detectado', width: 12, grupo: 'B', tipo: 'fecha' },
  { header: 'Condición observada', key: 'descripcion', width: 40, grupo: 'B' },
  { header: 'Acto / condición insegura', key: 'tipo', width: 14, grupo: 'B' },
  { header: 'Peligro', key: 'peligro', width: 24, grupo: 'B' },
  { header: 'Factor de riesgo', key: 'factor', width: 18, grupo: 'B' },
  { header: 'Consecuencias potenciales', key: 'consecuencias', width: 30, grupo: 'B' },
  { header: 'Trabajadores expuestos', key: 'expuestos', width: 10, grupo: 'B', tipo: 'num' },
  { header: 'Personas afectadas', key: 'afectadas', width: 10, grupo: 'B', tipo: 'num' },
  { header: 'ND', key: 'nd', width: 5, grupo: 'B', tipo: 'num' },
  { header: 'NE', key: 'ne', width: 5, grupo: 'B', tipo: 'num' },
  { header: 'NP', key: 'np', width: 5, grupo: 'B', tipo: 'num' },
  { header: 'NC', key: 'nc', width: 5, grupo: 'B', tipo: 'num' },
  { header: 'NR', key: 'nr', width: 7, grupo: 'B', tipo: 'num' },
  { header: 'Nivel de riesgo', key: 'nivel_riesgo', width: 8, grupo: 'B' },
  { header: 'Prioridad', key: 'prioridad', width: 10, grupo: 'B' },
  { header: 'Reincidente', key: 'reincidente', width: 9, grupo: 'B' },
  { header: 'Causa raíz', key: 'causas', width: 22, grupo: 'B' },
  { header: 'Base normativa', key: 'normativa', width: 22, grupo: 'B' },
  { header: 'Evidencia inicial', key: 'foto_ini', width: 12, grupo: 'B', tipo: 'link' },
  { header: 'Acción inmediata', key: 'inmediata', width: 28, grupo: 'C' },
  { header: 'Medida correctiva', key: 'correctiva', width: 32, grupo: 'C' },
  { header: 'Medida preventiva', key: 'preventiva', width: 28, grupo: 'C' },
  { header: 'Responsable de ejecutar', key: 'responsable', width: 20, grupo: 'C' },
  { header: 'Cargo', key: 'resp_cargo', width: 14, grupo: 'C' },
  { header: 'Responsable de verificar', key: 'verificador', width: 20, grupo: 'C' },
  { header: 'Fecha asignación', key: 'asignacion', width: 12, grupo: 'C', tipo: 'fecha' },
  { header: 'Plazo máximo', key: 'limite', width: 12, grupo: 'C', tipo: 'fecha' },
  { header: 'Estado', key: 'estado', width: 14, grupo: 'C' },
  { header: 'Recepción firmada', key: 'recibido', width: 15, grupo: 'D', tipo: 'fechahora' },
  { header: '% avance', key: 'avance', width: 8, grupo: 'D', tipo: 'num' },
  { header: 'Fecha de ejecución', key: 'ejecucion', width: 12, grupo: 'D', tipo: 'fecha' },
  { header: 'Acciones implementadas', key: 'acciones', width: 32, grupo: 'D' },
  { header: 'Observaciones del responsable', key: 'obs_resp', width: 24, grupo: 'D' },
  { header: 'Evidencia después', key: 'foto_fin', width: 12, grupo: 'D', tipo: 'link' },
  { header: 'Resultado verificación SST', key: 'verificacion', width: 28, grupo: 'D' },
  { header: 'Aprobación del cierre', key: 'aprobado', width: 12, grupo: 'D' },
  { header: 'Motivo de rechazo', key: 'rechazo', width: 24, grupo: 'D' },
  { header: 'Fecha efectiva de cierre', key: 'cierre', width: 15, grupo: 'D', tipo: 'fechahora' },
  { header: 'Días detección → cierre', key: 'dias', width: 10, grupo: 'D', tipo: 'num' },
  { header: 'Días vencido', key: 'dias_vencido', width: 8, grupo: 'D', tipo: 'num' },
  { header: 'N° notificaciones', key: 'n_notif', width: 10, grupo: 'D', tipo: 'num' },
];
const GRUPOS = {
  A: { titulo: 'A. DATOS GENERALES DE LA INSPECCIÓN', color: 'FF0C447C' },
  B: { titulo: 'B. IDENTIFICACIÓN Y EVALUACIÓN DEL HALLAZGO (GTC-45)', color: 'FF185FA5' },
  C: { titulo: 'C. MEDIDAS CORRECTIVAS Y PREVENTIVAS', color: 'FF3B6D11' },
  D: { titulo: 'D. SEGUIMIENTO Y CIERRE', color: 'FF534AB7' },
};

export async function generarExcel(r: ReporteMatriz, descFiltros: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Inspecciones SST ETINAR';
  wb.created = new Date();

  // ───────────── Hoja 1: MATRIZ ─────────────
  const ws = wb.addWorksheet('Matriz', { views: [{ state: 'frozen', ySplit: 7 }], properties: { defaultRowHeight: 15 } });
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const nCols = COLS.length;
  const ultimaLetra = ws.getColumn(nCols).letter;

  ws.mergeCells(`A1:${ultimaLetra}1`);
  ws.getCell('A1').value = 'ETINAR — MATRIZ DE HALLAZGOS · INSPECCIONES DE SEGURIDAD Y SALUD EN EL TRABAJO';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  ws.getRow(1).height = 24;
  ws.mergeCells(`A2:${ultimaLetra}2`);
  ws.getCell('A2').value = `Filtros: ${descFiltros}`;
  ws.mergeCells(`A3:${ultimaLetra}3`);
  ws.getCell('A3').value = `Generado: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} · Metodología de evaluación: GTC-45 (NP = ND × NE; NR = NP × NC)`;
  ws.getCell('A2').font = ws.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF5F5E5A' } };
  if (r.inspeccion) {
    ws.mergeCells(`A4:${ultimaLetra}4`);
    const i = r.inspeccion;
    ws.getCell('A4').value = `Inspección ${i.codigo} · ${i.proyectos?.nombre || ''} · ${new Date(i.fecha_hora).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} · Inspector: ${i.inspector?.nombre || '—'} · ${[i.area, i.ubicacion, i.nivel, i.frente].filter(Boolean).join(' / ')}${i.contratista ? ' · Contratista: ' + i.contratista : ''}`;
    ws.getCell('A4').font = { bold: true, size: 10, color: { argb: 'FF0C447C' } };
  }

  // Fila 6: grupos A-D · Fila 7: encabezados
  (Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).forEach((g) => {
    const idx = COLS.map((c, i) => (c.grupo === g ? i + 1 : 0)).filter(Boolean);
    const a = ws.getColumn(idx[0]).letter, b = ws.getColumn(idx[idx.length - 1]).letter;
    ws.mergeCells(`${a}6:${b}6`);
    const cell = ws.getCell(`${a}6`);
    cell.value = GRUPOS[g].titulo;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRUPOS[g].color } };
    cell.alignment = { horizontal: 'center' };
  });
  const head = ws.getRow(7);
  COLS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRUPOS[c.grupo].color } };
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  head.height = 36;

  r.detalles.forEach(({ h, antes, despues, notificaciones }, i) => {
    const valores: Record<string, unknown> = {
      n: i + 1, obra: h.obra_nombre, obra_codigo: h.obra_codigo, inspeccion: h.inspeccion_codigo, modalidad: modalidadLabel(h.modalidad),
      fecha_insp: fecha(h.inspeccion_fecha), inspector: h.inspector_nombre || h.creador_nombre, area: h.area, ubicacion: h.ubicacion,
      nivel: h.nivel, frente: h.frente, contratista: h.contratista, codigo: h.codigo, detectado: fecha(h.creado_en),
      descripcion: h.descripcion, tipo: TIPO_DESVIACION.find((t) => t.id === h.tipo_desviacion)?.label, peligro: h.peligro,
      factor: factorLabel(h.factor_riesgo), consecuencias: h.consecuencias, expuestos: h.trabajadores_expuestos, afectadas: h.personas_afectadas,
      nd: h.nd, ne: h.ne, np: h.np, nc: h.nc, nr: h.nr, nivel_riesgo: h.nivel_riesgo,
      prioridad: h.prioridad ? PRIORIDAD_LABEL[h.prioridad] : null, reincidente: h.reincidente_de ? 'Sí' : 'No',
      causas: (h.causas || []).map((c) => CAUSAS.find((x) => x.id === c)?.label).join(', '),
      normativa: (h.normativa || []).map((c) => NORMATIVAS.find((x) => x.id === c)?.label).join(', '),
      foto_ini: antes[0] ? { text: `Ver (${antes.length})`, hyperlink: antes[0].url } : 'Sin foto',
      inmediata: h.accion_inmediata, correctiva: h.accion_correctiva, preventiva: h.medida_preventiva,
      responsable: h.responsable_nombre, resp_cargo: h.responsable_cargo, verificador: h.verificador_nombre || 'SST',
      asignacion: fecha(h.fecha_asignacion), limite: fecha(h.fecha_limite), estado: ESTADO_LABEL[h.estado_efectivo],
      recibido: fecha(h.recibido_en), avance: h.cumplimiento, ejecucion: fecha(h.fecha_ejecucion),
      acciones: h.acciones_implementadas, obs_resp: h.observaciones_responsable,
      foto_fin: despues[0] ? { text: `Ver (${despues.length})`, hyperlink: despues[0].url } : 'Sin foto',
      verificacion: h.verificacion_resultado, aprobado: h.cierre_aprobado === true ? 'Aprobado' : h.cierre_aprobado === false ? 'Rechazado' : 'Pendiente',
      rechazo: h.motivo_rechazo, cierre: fecha(h.fecha_cierre), dias: h.dias_cierre != null ? Number(h.dias_cierre) : null,
      dias_vencido: h.estado_efectivo === 'vencido' ? h.dias_vencido : null, n_notif: notificaciones.length,
    };
    const row = ws.addRow(valores);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.font = { size: 9 };
    COLS.forEach((c, j) => {
      const cell = row.getCell(j + 1);
      cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
      if (c.tipo === 'fecha') cell.numFmt = 'dd/mm/yyyy';
      if (c.tipo === 'fechahora') cell.numFmt = 'dd/mm/yyyy hh:mm';
      if (c.tipo === 'link' && typeof cell.value === 'object') cell.font = { size: 9, color: { argb: AZUL }, underline: true };
    });
    const pc = row.getCell('prioridad');
    if (PRIOR_FILL[String(pc.value)]) {
      pc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIOR_FILL[String(pc.value)] } };
      pc.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      row.getCell('nivel_riesgo').fill = pc.fill;
      row.getCell('nivel_riesgo').font = pc.font;
    }
    const ec = row.getCell('estado');
    if (ESTADO_FILL[String(ec.value)]) { ec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESTADO_FILL[String(ec.value)] } }; ec.font = { bold: true, size: 9 }; }
  });
  const ultimaFila = Math.max(8, 7 + r.detalles.length);
  ws.autoFilter = { from: { row: 7, column: 1 }, to: { row: ultimaFila, column: nCols } };
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '6:7', margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
  ws.headerFooter.oddFooter = '&LETINAR · Matriz de hallazgos SST&RPágina &P de &N';

  // ───────────── Hoja 2: INDICADORES (fórmulas: se recalculan si se edita la matriz) ─────────────
  const ind = r.indicadores;
  const wi = wb.addWorksheet('Indicadores');
  wi.columns = [{ width: 42 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const L = (k: string) => ws.getColumn(k).letter;
  const rango = (k: string) => `Matriz!$${L(k)}$8:$${L(k)}$${ultimaFila}`;
  const titulo = (fila: number, texto: string) => {
    wi.mergeCells(`A${fila}:F${fila}`);
    const c = wi.getCell(`A${fila}`); c.value = texto;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  };
  titulo(1, 'INDICADORES DE CUMPLIMIENTO — ' + descFiltros);
  const kpis: [string, string, number | string | null, string?][] = [
    ['Total de inspecciones realizadas', '', ind.totalInspecciones],
    ['Total de hallazgos identificados', `COUNTA(${rango('codigo')})`, ind.totalHallazgos],
    ['Pendientes', `COUNTIF(${rango('estado')},"Pendiente")`, ind.porEstado.pendiente],
    ['En proceso', `COUNTIF(${rango('estado')},"En proceso")`, ind.porEstado.en_proceso],
    ['En verificación (pendientes de validación SST)', `COUNTIF(${rango('estado')},"En verificación")`, ind.porEstado.en_verificacion],
    ['Vencidos', `COUNTIF(${rango('estado')},"Vencido")`, ind.porEstado.vencido],
    ['Cerrados', `COUNTIF(${rango('estado')},"Cerrado")`, ind.cerrados],
    ['% de cumplimiento (cerrados / total)', 'IFERROR(B9/B4,0)', ind.totalHallazgos ? ind.cerrados / ind.totalHallazgos : 0, '0%'],
    ['% de vencimiento (vencidos / total)', 'IFERROR(B8/B4,0)', ind.totalHallazgos ? ind.porEstado.vencido / ind.totalHallazgos : 0, '0%'],
    ['Tiempo promedio de cierre (días)', `IFERROR(AVERAGE(${rango('dias')}),"—")`, ind.tiempoPromedioCierre ?? '—', '0.0'],
    ['Cierres dentro del plazo (%)', '', ind.pctCierreEnPlazo / 100, '0%'],
    ['Hallazgos reincidentes', `COUNTIF(${rango('reincidente')},"Sí")`, ind.reincidentes],
    ['Abiertos sin evidencia de cumplimiento', '', ind.sinEvidencia],
  ];
  kpis.forEach(([label, formula, valor, fmt], i) => {
    const fila = 3 + i;
    wi.getCell(`A${fila}`).value = label;
    const c = wi.getCell(`B${fila}`);
    c.value = formula ? { formula, result: valor as number } : (valor as number);
    if (fmt) c.numFmt = fmt;
    c.font = { bold: true };
    c.alignment = { horizontal: 'right' };
  });
  wi.getCell('B3').value = ind.totalInspecciones;

  let fila = 3 + kpis.length + 2;
  const tabla = (nombre: string, items: [string, number][], key: string, etiqueta?: (k: string) => string) => {
    titulo(fila, nombre); fila++;
    ['', 'Total', 'Cerrados', 'Vencidos', '% cumplimiento'].forEach((t, i) => {
      const c = wi.getCell(fila, i + 1); c.value = t || nombre.replace('Hallazgos por ', '').replace(/^./, (x) => x.toUpperCase()); c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1EFE8' } };
    });
    fila++;
    items.forEach(([k, n]) => {
      const lbl = etiqueta ? etiqueta(k) : k;
      const hsK = r.hs.filter((h) => (key === 'nivel_riesgo' ? h.nivel_riesgo === k : key === 'obra' ? h.obra_nombre === k : (h.responsable_nombre || 'Sin dato') === k));
      const crit = `${rango(key)},"${key === 'nivel_riesgo' ? k : lbl}"`;
      wi.getCell(fila, 1).value = lbl;
      wi.getCell(fila, 2).value = { formula: `COUNTIF(${crit})`, result: n };
      wi.getCell(fila, 3).value = { formula: `COUNTIFS(${crit},${rango('estado')},"Cerrado")`, result: hsK.filter((h) => h.estado === 'cerrado').length };
      wi.getCell(fila, 4).value = { formula: `COUNTIFS(${crit},${rango('estado')},"Vencido")`, result: hsK.filter((h) => h.estado_efectivo === 'vencido').length };
      wi.getCell(fila, 5).value = { formula: `IFERROR(C${fila}/B${fila},0)`, result: n ? hsK.filter((h) => h.estado === 'cerrado').length / n : 0 };
      wi.getCell(fila, 5).numFmt = '0%';
      fila++;
    });
    fila++;
  };
  tabla('Hallazgos por nivel de riesgo', ind.porNivel, 'nivel_riesgo', (k) => k);
  tabla('Hallazgos por obra', ind.porObra, 'obra');
  tabla('Hallazgos por responsable', ind.porResponsable, 'responsable');

  // ───────────── Hoja 3: SEGUIMIENTO (historial de estados) ─────────────
  const wh = wb.addWorksheet('Historial');
  wh.columns = [
    { header: 'Código hallazgo', key: 'c', width: 16 }, { header: 'Fecha', key: 'f', width: 17 },
    { header: 'Usuario', key: 'u', width: 22 }, { header: 'Acción', key: 'a', width: 30 },
    { header: 'Estado anterior', key: 'ea', width: 15 }, { header: 'Estado nuevo', key: 'en', width: 15 },
    { header: 'Detalle', key: 'd', width: 70 },
  ];
  r.detalles.forEach(({ h, historial }) => historial.forEach((x) => wh.addRow({
    c: h.codigo, f: fecha(x.creado_en), u: x.usuario, a: ACCION_LABEL[x.accion] || x.accion,
    ea: x.estado_anterior, en: x.estado_snapshot, d: x.detalle,
  })));
  estiloTabla(wh);

  // ───────────── Hoja 4: NOTIFICACIONES ─────────────
  const wn = wb.addWorksheet('Notificaciones');
  wn.columns = [
    { header: 'Código hallazgo', key: 'c', width: 16 }, { header: 'Fecha', key: 'f', width: 17 },
    { header: 'Destinatario', key: 'd', width: 26 }, { header: 'Canal', key: 'k', width: 10 },
    { header: 'Evento', key: 'e', width: 20 }, { header: 'Resultado', key: 'r', width: 50 },
  ];
  r.detalles.forEach(({ h, notificaciones }) => notificaciones.forEach((x) => wn.addRow({
    c: h.codigo, f: fecha(x.creado_en), d: x.destinatario, k: x.canal, e: x.evento, r: x.estado,
  })));
  estiloTabla(wn);

  // ───────────── Hoja 5: EVIDENCIAS (enlaces a todas las fotos) ─────────────
  const we = wb.addWorksheet('Evidencias');
  we.columns = [
    { header: 'Código hallazgo', key: 'c', width: 16 }, { header: 'Tipo', key: 't', width: 18 },
    { header: 'Descripción', key: 'd', width: 50 }, { header: 'Fecha', key: 'f', width: 17 }, { header: 'Enlace', key: 'u', width: 14 },
  ];
  r.detalles.forEach(({ h, antes, avances, despues }) => {
    ([['Inicial (antes)', antes], ['Avance', avances], ['Cumplimiento (después)', despues]] as const).forEach(([t, lista]) =>
      lista.forEach((x) => {
        const row = we.addRow({ c: h.codigo, t, d: x.descripcion, f: fecha(x.fecha), u: { text: 'Abrir foto', hyperlink: x.url } });
        row.getCell('u').font = { color: { argb: AZUL }, underline: true };
      }));
  });
  estiloTabla(we);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function estiloTabla(w: ExcelJS.Worksheet) {
  const h = w.getRow(1);
  h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  w.views = [{ state: 'frozen', ySplit: 1 }];
  w.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(2, w.rowCount), column: w.columnCount } };
  w.eachRow((row, i) => { if (i > 1) { row.alignment = { wrapText: true, vertical: 'top' }; row.font = { size: 9 }; } });
  w.getColumn(2).numFmt = 'dd/mm/yyyy hh:mm';
}
