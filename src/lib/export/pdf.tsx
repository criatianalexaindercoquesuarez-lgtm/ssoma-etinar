/* eslint-disable jsx-a11y/alt-text -- <Image> de react-pdf no admite alt */
import 'server-only';
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer, Link } from '@react-pdf/renderer';
import type { DetalleHallazgo, Foto, FirmaReporte, ReporteMatriz } from './datos';
import type { Indicadores } from '../matriz';
import {
  ACCION_LABEL, CAUSAS, ESTADO_COLOR, ESTADO_LABEL, NORMATIVAS, PRIORIDAD_COLOR, PRIORIDAD_LABEL, TIPO_DESVIACION,
  type Firma, type HallazgoVista,
} from '../types';
import { factorLabel, NIVEL_RIESGO_INFO } from '../gtc45';
import { modalidadLabel } from '../modalidades';

type Img = { data: Buffer; format: 'jpg' | 'png' } | null;
const AZUL = '#185FA5', AZUL_OSC = '#0C447C', GRIS = '#5F5E5A', LINEA = '#D9D7CF';

const TZ = { timeZone: 'America/Guayaquil' } as const;
const fF = (s?: string | null) => (s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('es-EC', TZ) : '-');
const fFH = (s?: string | null) => (s ? new Date(s).toLocaleString('es-EC', { ...TZ, dateStyle: 'short', timeStyle: 'short' }) : '-');
const t = (s?: string | number | null) => (s === null || s === undefined || s === '' ? '-' : String(s));

const st = StyleSheet.create({
  page: { paddingTop: 66, paddingBottom: 34, paddingHorizontal: 20, fontSize: 8, fontFamily: 'Helvetica', color: '#222' },
  header: { position: 'absolute', top: 16, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: AZUL, paddingBottom: 6 },
  marca: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: AZUL, letterSpacing: 1 },
  headTitulo: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: AZUL_OSC },
  headSub: { fontSize: 7, color: GRIS },
  footer: { position: 'absolute', bottom: 14, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: '#888', borderTopWidth: 0.5, borderTopColor: LINEA, paddingTop: 4 },
  seccion: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: AZUL, paddingVertical: 3, paddingHorizontal: 6, marginTop: 8, marginBottom: 4 },
  kv: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINEA },
  k: { width: '30%', backgroundColor: '#F5F5F3', padding: 3, fontFamily: 'Helvetica-Bold', color: '#444' },
  v: { width: '70%', padding: 3 },
  th: { fontFamily: 'Helvetica-Bold', color: '#fff', fontSize: 6.5, padding: 2.5, borderRightWidth: 0.5, borderRightColor: '#fff' },
  td: { fontSize: 6.3, padding: 2.5, borderRightWidth: 0.5, borderRightColor: LINEA, lineHeight: 1.25 },
  chip: { color: '#fff', fontFamily: 'Helvetica-Bold', paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 3, fontSize: 6.5, textAlign: 'center' },
});

function Encabezado({ titulo, sub, codigo, logo }: { titulo: string; sub: string; codigo?: string; logo: Img }) {
  return (
    <View style={st.header} fixed>
      {logo ? <Image src={logo} style={{ height: 30, width: 90, objectFit: 'contain', marginRight: 10 }} /> : <Text style={[st.marca, { marginRight: 12 }]}>ETINAR</Text>}
      <View style={{ flex: 1 }}>
        <Text style={st.headTitulo}>{titulo}</Text>
        <Text style={st.headSub}>{sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', width: 140, marginLeft: 8 }}>
        {codigo && <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: AZUL }}>{codigo}</Text>}
        <Text style={st.headSub}>Seguridad y Salud en el Trabajo</Text>
        <Text style={st.headSub}>Emitido: {fFH(new Date().toISOString())}</Text>
      </View>
    </View>
  );
}
function Pie({ texto }: { texto: string }) {
  return (
    <View style={st.footer} fixed>
      <Text>{texto}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}
function KV({ filas }: { filas: [string, React.ReactNode][] }) {
  return (
    <View style={{ borderWidth: 0.5, borderColor: LINEA, borderBottomWidth: 0 }}>
      {filas.map(([k, v]) => (
        <View key={k} style={st.kv} wrap={false}>
          <Text style={st.k}>{k}</Text>
          {typeof v === 'string' || typeof v === 'number' || v == null ? <Text style={st.v}>{t(v as string)}</Text> : <View style={st.v}>{v}</View>}
        </View>
      ))}
    </View>
  );
}
function ChipPrioridad({ h }: { h: HallazgoVista }) {
  if (!h.prioridad) return <Text>-</Text>;
  return <Text style={[st.chip, { backgroundColor: PRIORIDAD_COLOR[h.prioridad] }]}>{h.nivel_riesgo ? `${h.nivel_riesgo} - ` : ''}{PRIORIDAD_LABEL[h.prioridad]}</Text>;
}
function ChipEstado({ h }: { h: HallazgoVista }) {
  const c = ESTADO_COLOR[h.estado_efectivo];
  return <Text style={[st.chip, { backgroundColor: c.bg, color: c.fg }]}>{ESTADO_LABEL[h.estado_efectivo]}</Text>;
}

function FotoBox({ f, w, hgt }: { f: Foto; w: number; hgt: number }) {
  return (
    <View style={{ width: w, marginRight: 6, marginBottom: 6 }} wrap={false}>
      <View style={{ width: w, height: hgt, borderWidth: 0.5, borderColor: LINEA, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' }}>
        {f.img ? <Image src={f.img} style={{ maxWidth: w - 2, maxHeight: hgt - 2, objectFit: 'contain' }} />
          : <Link src={f.url} style={{ fontSize: 6.5, color: AZUL }}>Ver foto en línea</Link>}
      </View>
      <Text style={{ fontSize: 6.3, color: GRIS, marginTop: 1.5 }}>{t(f.descripcion)} ({fF(f.fecha)})</Text>
    </View>
  );
}
function GaleriaFotos({ titulo, fotos, w = 170, h = 128 }: { titulo: string; fotos: Foto[]; w?: number; h?: number }) {
  return (
    <View style={{ marginTop: 4 }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRIS, marginBottom: 2 }}>{titulo}</Text>
      {fotos.length === 0 ? <Text style={{ fontSize: 6.5, color: '#999' }}>Sin fotografías registradas.</Text>
        : <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{fotos.map((f, i) => <FotoBox key={i} f={f} w={w} hgt={h} />)}</View>}
    </View>
  );
}

const FIRMA_ROL: Record<Firma['tipo'], string> = {
  elaboracion: 'Elaborado por: Inspector SST',
  recepcion: 'Recibido por: Residente / Jefe de Obra',
  ejecucion: 'Ejecutado por: Residente / Jefe de Obra',
  verificacion: 'Verificado y aprobado: Coordinador SST',
};
function Firmas({ firmas, tipos }: { firmas: FirmaReporte[]; tipos: Firma['tipo'][] }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }} wrap={false}>
      {tipos.map((tp) => {
        const f = [...firmas].reverse().find((x) => x.tipo === tp);
        return (
          <View key={tp} style={{ flex: 1, marginRight: 6, borderWidth: 0.5, borderColor: LINEA, padding: 4, alignItems: 'center' }}>
            <View style={{ height: 38, justifyContent: 'center', alignItems: 'center' }}>
              {f?.img ? <Image src={f.img} style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }} />
                : f ? <Text style={{ fontSize: 6.5, color: '#3B6D11' }}>Validado electrónicamente</Text> : null}
            </View>
            <View style={{ borderTopWidth: 0.7, borderTopColor: '#333', width: '90%', paddingTop: 2, alignItems: 'center' }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{f?.nombre || ' '}</Text>
              <Text style={{ fontSize: 6, color: GRIS }}>{f?.cargo || ' '}</Text>
              <Text style={{ fontSize: 6, color: GRIS }}>{FIRMA_ROL[tp]}</Text>
              <Text style={{ fontSize: 5.8, color: '#999' }}>{f ? fFH(f.creado_en) : 'Fecha: ____/____/______'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ═══════════════════════ REPORTE INDIVIDUAL DE HALLAZGO ═══════════════════════
function DocHallazgo({ d, logo }: { d: DetalleHallazgo; logo: Img }) {
  const h = d.h;
  const info = h.nivel_riesgo ? NIVEL_RIESGO_INFO[h.nivel_riesgo] : null;
  return (
    <Document title={`Reporte ${h.codigo}`} author="ETINAR - SST">
      <Page size="A4" style={st.page}>
        <Encabezado titulo="REPORTE DE ENTREGA DE HALLAZGO" sub={`${h.obra_nombre}${h.obra_codigo ? ` (${h.obra_codigo})` : ''} - Inspección ${t(h.inspeccion_codigo)}`} codigo={h.codigo} logo={logo} />
        <Pie texto={`ETINAR - ${h.codigo} - Documento de respaldo para exigir el cumplimiento de la medida correctiva`} />

        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <View style={{ marginRight: 4 }}><ChipPrioridad h={h} /></View>
          <ChipEstado h={h} />
          {h.reincidente_de ? <Text style={[st.chip, { backgroundColor: '#534AB7', marginLeft: 4 }]}>Reincidente</Text> : null}
        </View>

        <Text minPresenceAhead={70} style={st.seccion}>1. HALLAZGO DETECTADO</Text>
        <KV filas={[
          ['Obra / código proyecto', `${h.obra_nombre} / ${t(h.obra_codigo)}`],
          ['Inspección / modalidad', `${t(h.inspeccion_codigo)} - ${modalidadLabel(h.modalidad)}`],
          ['Fecha y hora de detección', fFH(h.inspeccion_fecha || h.creado_en)],
          ['Inspector', t(h.inspector_nombre || h.creador_nombre)],
          ['Ubicación', [h.area, h.ubicacion, h.nivel, h.frente].filter(Boolean).join(' / ')],
          ['Contratista', t(h.contratista)],
          ['Condición observada', h.descripcion],
          ['Acto / condición insegura', t(TIPO_DESVIACION.find((x) => x.id === h.tipo_desviacion)?.label)],
          ['Peligro / factor de riesgo', `${t(h.peligro)} / ${factorLabel(h.factor_riesgo)}`],
          ['Consecuencias potenciales', t(h.consecuencias)],
          ['Expuestos / afectados', `${t(h.trabajadores_expuestos)} trabajadores - ${t(h.personas_afectadas)} otras personas`],
          ['Evaluación GTC-45', h.nr != null ? `ND ${h.nd} x NE ${h.ne} = NP ${h.np};  NP x NC ${h.nc} = NR ${h.nr}  =>  Nivel ${h.nivel_riesgo} - Prioridad ${PRIORIDAD_LABEL[h.prioridad!]}` : '-'],
          ['Interpretación', t(info?.significado)],
          ['Causa raíz / normativa', `${(h.causas || []).map((c) => CAUSAS.find((x) => x.id === c)?.label).join(', ') || '-'} / ${(h.normativa || []).map((c) => NORMATIVAS.find((x) => x.id === c)?.label).join(', ') || '-'}`],
        ]} />
        <GaleriaFotos titulo="Evidencia fotográfica inicial (ANTES)" fotos={d.antes} w={170} h={128} />

        <Text minPresenceAhead={70} style={st.seccion}>2. ENTREGA AL RESPONSABLE - ACCIÓN EXIGIDA</Text>
        <KV filas={[
          ['Acción inmediata', t(h.accion_inmediata)],
          ['Medida correctiva requerida', <Text key="mc" style={{ fontFamily: 'Helvetica-Bold' }}>{h.accion_correctiva}</Text>],
          ['Medida preventiva', t(h.medida_preventiva)],
          ['Responsable de ejecutar', `${t(h.responsable_nombre)}${h.responsable_cargo ? ' - ' + h.responsable_cargo : ''}`],
          ['Responsable de verificar', t(h.verificador_nombre || 'Personal SST')],
          ['Fecha de asignación', fF(h.fecha_asignacion)],
          ['FECHA LÍMITE DE CUMPLIMIENTO', <Text key="fl" style={{ fontFamily: 'Helvetica-Bold', color: '#A32D2D', fontSize: 9 }}>{fF(h.fecha_limite)}{h.estado_efectivo === 'vencido' ? `  (VENCIDO hace ${h.dias_vencido} días)` : ''}</Text>],
          ['Acuse de recibo', h.recibido_en ? `Firmado el ${fFH(h.recibido_en)}` : 'Pendiente'],
        ]} />
        <Firmas firmas={d.firmas} tipos={['elaboracion', 'recepcion']} />

        <Text minPresenceAhead={70} style={st.seccion} break={d.antes.length > 2}>3. EVIDENCIA DE CUMPLIMIENTO</Text>
        <KV filas={[
          ['Avance', `${h.cumplimiento}%`],
          ['Fecha de ejecución', fF(h.fecha_ejecucion)],
          ['Acciones implementadas', t(h.acciones_implementadas)],
          ['Observaciones del responsable', t(h.observaciones_responsable)],
        ]} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <View style={{ width: '50%' }}><GaleriaFotos titulo="ANTES" fotos={d.antes.slice(0, 2)} w={124} h={93} /></View>
          <View style={{ width: '50%' }}><GaleriaFotos titulo="DESPUÉS" fotos={d.despues} w={124} h={93} /></View>
        </View>
        {d.avances.length > 0 && <GaleriaFotos titulo="Registro de avances" fotos={d.avances} w={124} h={93} />}

        <Text minPresenceAhead={70} style={st.seccion}>4. VERIFICACIÓN Y CIERRE SST</Text>
        <KV filas={[
          ['Resultado de la verificación', t(h.verificacion_resultado)],
          ['Decisión', h.cierre_aprobado === true ? 'CIERRE APROBADO' : h.cierre_aprobado === false ? 'CIERRE RECHAZADO' : 'Pendiente de verificación'],
          ['Motivo de rechazo', t(h.motivo_rechazo)],
          ['Fecha efectiva de cierre', fFH(h.fecha_cierre)],
          ['Tiempo detección - cierre', h.dias_cierre != null ? `${h.dias_cierre} días` : '-'],
        ]} />
        <Firmas firmas={d.firmas} tipos={['ejecucion', 'verificacion']} />

        <Text minPresenceAhead={70} style={st.seccion}>HISTORIAL DE SEGUIMIENTO Y NOTIFICACIONES</Text>
        {d.historial.map((x) => (
          <View key={x.id} style={{ flexDirection: 'row', borderBottomWidth: 0.4, borderBottomColor: LINEA, paddingVertical: 1.5 }} wrap={false}>
            <Text style={{ width: 70, fontSize: 6.5, color: GRIS }}>{fFH(x.creado_en)}</Text>
            <Text style={{ width: 90, fontSize: 6.5 }}>{t(x.usuario)}</Text>
            <Text style={{ width: 120, fontSize: 6.5, fontFamily: 'Helvetica-Bold' }}>{ACCION_LABEL[x.accion] || x.accion}</Text>
            <Text style={{ flex: 1, fontSize: 6.5 }}>{t(x.detalle)}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 6.5, color: GRIS, marginTop: 3 }}>
          Notificaciones por correo enviadas: {d.notificaciones.filter((n) => !n.estado.startsWith('error')).length}
          {d.notificaciones.length ? ` (última: ${fFH(d.notificaciones[d.notificaciones.length - 1].creado_en)})` : ''}
        </Text>
      </Page>
    </Document>
  );
}

// ═══════════════════════ MATRIZ COMPLETA (HORIZONTAL) ═══════════════════════
const COLS: { titulo: string; w: number; render: (h: HallazgoVista, i: number) => React.ReactNode }[] = [
  { titulo: 'N° / Código', w: 45, render: (h, i) => <><Text style={{ fontFamily: 'Helvetica-Bold' }}>{i + 1}. {h.codigo}</Text><Text style={{ color: GRIS }}>{fF(h.creado_en)}</Text></> },
  { titulo: 'Ubicación', w: 58, render: (h) => <Text>{[h.area, h.ubicacion, h.nivel, h.frente].filter(Boolean).join(' / ')}{h.contratista ? `\nContr.: ${h.contratista}` : ''}</Text> },
  { titulo: 'Condición observada', w: 104, render: (h) => <Text>{h.descripcion}</Text> },
  { titulo: 'Tipo / peligro / factor', w: 78, render: (h) => <Text>{t(TIPO_DESVIACION.find((x) => x.id === h.tipo_desviacion)?.label)}{'\n'}{t(h.peligro)}{'\n'}<Text style={{ color: GRIS }}>{factorLabel(h.factor_riesgo)}</Text></Text> },
  { titulo: 'Consecuencias potenciales', w: 70, render: (h) => <Text>{t(h.consecuencias)}</Text> },
  { titulo: 'Exp.', w: 24, render: (h) => <Text style={{ textAlign: 'center' }}>{t(h.trabajadores_expuestos)}{h.personas_afectadas ? `\n+${h.personas_afectadas}` : ''}</Text> },
  { titulo: 'ND/NE/NC NR', w: 44, render: (h) => <Text style={{ textAlign: 'center' }}>{h.nr != null ? `${h.nd}/${h.ne}/${h.nc}\nNP ${h.np}\nNR ${h.nr}` : '-'}</Text> },
  { titulo: 'Nivel / prioridad', w: 44, render: (h) => <ChipPrioridad h={h} /> },
  { titulo: 'Medidas: inmediata / correctiva / preventiva', w: 124, render: (h) => <Text>{h.accion_inmediata ? `Inm.: ${h.accion_inmediata}\n` : ''}<Text style={{ fontFamily: 'Helvetica-Bold' }}>Corr.: {h.accion_correctiva}</Text>{h.medida_preventiva ? `\nPrev.: ${h.medida_preventiva}` : ''}</Text> },
  { titulo: 'Responsable / verificador', w: 62, render: (h) => <Text>{t(h.responsable_nombre)}{'\n'}<Text style={{ color: GRIS }}>Verif.: {t(h.verificador_nombre || 'SST')}</Text></Text> },
  { titulo: 'Asignado / límite', w: 42, render: (h) => <Text>{fF(h.fecha_asignacion)}{'\n'}<Text style={{ fontFamily: 'Helvetica-Bold', color: h.estado_efectivo === 'vencido' ? '#A32D2D' : '#222' }}>{fF(h.fecha_limite)}</Text></Text> },
  { titulo: 'Estado', w: 44, render: (h) => <><ChipEstado h={h} /><Text style={{ textAlign: 'center', marginTop: 1 }}>{h.cumplimiento}%</Text></> },
  { titulo: 'Resultado / cierre', w: 62, render: (h) => <Text>{h.estado === 'cerrado' ? `Cerrado ${fF(h.fecha_cierre)}\n${t(h.dias_cierre)} días` : h.motivo_rechazo ? `Rechazado: ${h.motivo_rechazo}` : h.acciones_implementadas ? `Ejecutado ${fF(h.fecha_ejecucion)}` : '-'}</Text> },
];

function ResumenIndicadores({ ind }: { ind: Indicadores }) {
  const items: [string, string | number, string][] = [
    ['Inspecciones', ind.totalInspecciones, AZUL_OSC], ['Hallazgos', ind.totalHallazgos, AZUL_OSC],
    ['Pendientes', ind.porEstado.pendiente, GRIS], ['En proceso', ind.porEstado.en_proceso, '#854F0B'],
    ['En verificación', ind.porEstado.en_verificacion, AZUL], ['Vencidos', ind.porEstado.vencido, '#A32D2D'],
    ['Cerrados', `${ind.cerrados} (${ind.pctCumplimiento}%)`, '#3B6D11'],
    ['Prom. cierre', ind.tiempoPromedioCierre != null ? `${ind.tiempoPromedioCierre} d` : '-', AZUL_OSC],
    ['Reincidentes', ind.reincidentes, '#534AB7'],
  ];
  return (
    <View style={{ flexDirection: 'row', marginVertical: 4 }}>
      {items.map(([k, v, c]) => (
        <View key={k} style={{ flex: 1, borderWidth: 0.5, borderColor: LINEA, padding: 4, marginRight: 3 }}>
          <Text style={{ fontSize: 6.3, color: GRIS }}>{k}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: c }}>{String(v)}</Text>
        </View>
      ))}
    </View>
  );
}

function DocMatriz({ r, filtros, logo, titulo = 'MATRIZ DE HALLAZGOS - INSPECCIONES SST' }: { r: ReporteMatriz; filtros: string; logo: Img; titulo?: string }) {
  const i = r.inspeccion;
  const firmasConsolidadas = (tipo: Firma['tipo']) => Array.from(new Set(r.detalles.flatMap((d) => d.firmas.filter((f) => f.tipo === tipo).map((f) => f.nombre))));
  const resp = Array.from(new Set(r.hs.map((h) => h.responsable_nombre).filter(Boolean)));
  return (
    <Document title={titulo} author="ETINAR - SST">
      <Page size="A4" orientation="landscape" style={st.page}>
        <Encabezado titulo={titulo} sub={filtros} codigo={i?.codigo} logo={logo} />
        <Pie texto="ETINAR - Sistema de Inspecciones SST - Matriz de hallazgos (metodología GTC-45)" />

        <Text minPresenceAhead={70} style={st.seccion}>A. DATOS GENERALES</Text>
        {i ? (
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: 6 }}><KV filas={[
              ['Obra / código proyecto', `${i.proyectos?.nombre || '-'} / ${t(i.proyectos?.codigo)}`],
              ['Código de inspección', i.codigo], ['Modalidad', modalidadLabel(i.modalidad)],
              ['Fecha y hora', fFH(i.fecha_hora)],
            ]} /></View>
            <View style={{ flex: 1 }}><KV filas={[
              ['Inspector responsable', t(i.inspector?.nombre)],
              ['Área / ubicación', [i.area, i.ubicacion].filter(Boolean).join(' / ') || '-'],
              ['Nivel / frente', [i.nivel, i.frente].filter(Boolean).join(' / ') || '-'],
              ['Empresa contratista', t(i.contratista)],
            ]} /></View>
          </View>
        ) : (
          <KV filas={[['Alcance del reporte', filtros], ['Obras incluidas', r.indicadores.porObra.map(([k, n]) => `${k} (${n})`).join(', ') || '-']]} />
        )}
        <ResumenIndicadores ind={r.indicadores} />

        <Text minPresenceAhead={70} style={st.seccion}>B-D. MATRIZ DE HALLAZGOS, EVALUACIÓN DEL RIESGO, MEDIDAS Y SEGUIMIENTO</Text>
        <View style={{ flexDirection: 'row', backgroundColor: AZUL_OSC }} fixed>
          {COLS.map((c) => <Text key={c.titulo} style={[st.th, { width: c.w }]}>{c.titulo}</Text>)}
        </View>
        {r.hs.length === 0 && <Text style={{ padding: 8, color: GRIS }}>No hay hallazgos para los filtros seleccionados.</Text>}
        {r.hs.map((h, idx) => (
          <View key={h.id} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINEA, borderLeftWidth: 0.5, borderLeftColor: LINEA, backgroundColor: idx % 2 ? '#FAFAF8' : '#fff' }} wrap={false}>
            {COLS.map((c) => <View key={c.titulo} style={[st.td, { width: c.w }]}>{c.render(h, idx)}</View>)}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text minPresenceAhead={70} style={st.seccion}>VALIDACIONES</Text>
          <View style={{ flexDirection: 'row' }}>
            {[
              ['Elaborado por (Inspector SST)', i?.inspector?.nombre || firmasConsolidadas('elaboracion').join(', ')],
              ['Recibido por (Residente / Jefe de Obra)', firmasConsolidadas('recepcion').join(', ') || resp.join(', ')],
              ['Aprobado por (Coordinador SST)', firmasConsolidadas('verificacion').join(', ')],
            ].map(([rol, nombre]) => (
              <View key={rol} style={{ flex: 1, marginRight: 8, alignItems: 'center' }}>
                <View style={{ height: 36 }} />
                <View style={{ borderTopWidth: 0.7, borderTopColor: '#333', width: '85%', paddingTop: 2, alignItems: 'center' }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{nombre || ' '}</Text>
                  <Text style={{ fontSize: 6.5, color: GRIS }}>{rol}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {r.detalles.length > 0 && (
        <Page size="A4" orientation="landscape" style={st.page}>
          <Encabezado titulo="EVIDENCIAS FOTOGRÁFICAS Y SEGUIMIENTO" sub={filtros} codigo={i?.codigo} logo={logo} />
          <Pie texto="ETINAR - Evidencias antes / después y verificación de cierre" />
          {r.detalles.map((d) => (
            <View key={d.h.id} wrap={false} style={{ borderWidth: 0.5, borderColor: LINEA, padding: 5, marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: AZUL, fontSize: 9, marginRight: 6 }}>{d.h.codigo}</Text>
                <ChipPrioridad h={d.h} /><View style={{ width: 4 }} /><ChipEstado h={d.h} />
                <Text style={{ marginLeft: 6, color: GRIS, flex: 1 }}>{d.h.obra_nombre} - {[d.h.area, d.h.ubicacion].filter(Boolean).join(' / ')} - Resp.: {t(d.h.responsable_nombre)} - Límite {fF(d.h.fecha_limite)}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 330 }}>
                  <Text style={{ fontSize: 7 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Condición: </Text>{d.h.descripcion}</Text>
                  <GaleriaFotos titulo="ANTES" fotos={d.antes} w={156} h={110} />
                </View>
                <View style={{ width: 330, marginLeft: 8 }}>
                  <Text style={{ fontSize: 7 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Acciones implementadas: </Text>{t(d.h.acciones_implementadas)}</Text>
                  <GaleriaFotos titulo="DESPUÉS" fotos={d.despues} w={156} h={110} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: GRIS }}>Seguimiento</Text>
                  <Text style={{ fontSize: 6.5 }}>Recepción: {d.h.recibido_en ? fFH(d.h.recibido_en) : 'Pendiente'}</Text>
                  <Text style={{ fontSize: 6.5 }}>Ejecución: {fF(d.h.fecha_ejecucion)}</Text>
                  <Text style={{ fontSize: 6.5 }}>Verificación: {t(d.h.verificacion_resultado)}</Text>
                  <Text style={{ fontSize: 6.5 }}>Decisión: {d.h.cierre_aprobado === true ? 'Aprobado' : d.h.cierre_aprobado === false ? 'Rechazado' : 'Pendiente'}</Text>
                  {d.h.motivo_rechazo ? <Text style={{ fontSize: 6.5, color: '#A32D2D' }}>Motivo: {d.h.motivo_rechazo}</Text> : null}
                  <Text style={{ fontSize: 6.5 }}>Cierre: {fFH(d.h.fecha_cierre)}{d.h.dias_cierre != null ? ` (${d.h.dias_cierre} d)` : ''}</Text>
                  <Text style={{ fontSize: 6.5, marginTop: 2, fontFamily: 'Helvetica-Bold', color: GRIS }}>Firmas</Text>
                  {d.firmas.map((f) => <Text key={f.id} style={{ fontSize: 6 }}>{FIRMA_ROL[f.tipo].split(':')[0]}: {f.nombre} ({fF(f.creado_en)})</Text>)}
                </View>
              </View>
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}

// ═══════════════════════ REPORTE SEMANAL / MENSUAL ═══════════════════════
function Barras({ titulo, datos, color }: { titulo: string; datos: [string, number][]; color: string | ((k: string) => string) }) {
  const max = Math.max(1, ...datos.map((d) => d[1]));
  return (
    <View style={{ flex: 1, marginRight: 8, marginBottom: 6 }} wrap={false}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: AZUL_OSC, marginBottom: 3 }}>{titulo}</Text>
      {datos.length === 0 && <Text style={{ color: '#999' }}>Sin datos</Text>}
      {datos.slice(0, 12).map(([k, n]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ width: 110, fontSize: 6.8, textAlign: 'right', marginRight: 4 }}>{k}</Text>
          <View style={{ flex: 1, height: 7, backgroundColor: '#F1EFE8' }}>
            <View style={{ width: `${(n / max) * 100}%`, height: 7, backgroundColor: typeof color === 'function' ? color(k) : color }} />
          </View>
          <Text style={{ width: 20, fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{n}</Text>
        </View>
      ))}
    </View>
  );
}
function DocPeriodo({ r, etiqueta, filtros, logo }: { r: ReporteMatriz; etiqueta: string; filtros: string; logo: Img }) {
  const ind = r.indicadores;
  const colorNivel = (k: string) => ({ 'Nivel I': PRIORIDAD_COLOR.critica, 'Nivel II': PRIORIDAD_COLOR.alta, 'Nivel III': PRIORIDAD_COLOR.media, 'Nivel IV': PRIORIDAD_COLOR.baja } as Record<string, string>)[k] || AZUL;
  const pendientes = r.hs.filter((h) => h.estado !== 'cerrado');
  return (
    <Document title={`Reporte SST ${etiqueta}`} author="ETINAR - SST">
      <Page size="A4" style={st.page}>
        <Encabezado titulo={`REPORTE CONSOLIDADO SST - ${etiqueta.toUpperCase()}`} sub={filtros} logo={logo} />
        <Pie texto="ETINAR - Reporte generado automáticamente con la información registrada en el sistema" />
        <Text minPresenceAhead={70} style={st.seccion}>INDICADORES DEL PERIODO</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {([
            ['Inspecciones realizadas', ind.totalInspecciones], ['Hallazgos identificados', ind.totalHallazgos],
            ['Cerrados', ind.cerrados], ['% de cumplimiento', `${ind.pctCumplimiento}%`],
            ['Cierres dentro del plazo', `${ind.pctCierreEnPlazo}%`], ['Tiempo promedio de cierre', ind.tiempoPromedioCierre != null ? `${ind.tiempoPromedioCierre} días` : '-'],
            ['Pendientes', ind.porEstado.pendiente], ['En proceso', ind.porEstado.en_proceso],
            ['Vencidos', ind.porEstado.vencido], ['Pendientes de validación SST', ind.pendientesValidacion],
            ['Abiertos sin evidencia', ind.sinEvidencia], ['Hallazgos reincidentes', ind.reincidentes],
          ] as [string, string | number][]).map(([k, v]) => (
            <View key={k} style={{ width: '24%', marginRight: '1%', marginBottom: 4, borderWidth: 0.5, borderColor: LINEA, padding: 5 }}>
              <Text style={{ fontSize: 6.5, color: GRIS }}>{k}</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: AZUL_OSC }}>{String(v)}</Text>
            </View>
          ))}
        </View>
        <Text minPresenceAhead={70} style={st.seccion}>DISTRIBUCIÓN</Text>
        <View style={{ flexDirection: 'row' }}>
          <Barras titulo="Por nivel de riesgo (GTC-45)" datos={ind.porNivel.map(([k, n]) => [`Nivel ${k}`, n])} color={colorNivel} />
          <Barras titulo="Por estado" datos={Object.entries(ind.porEstado).map(([k, n]) => [ESTADO_LABEL[k as keyof typeof ESTADO_LABEL], n])} color={AZUL} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Barras titulo="Por obra" datos={ind.porObra} color={AZUL_OSC} />
          <Barras titulo="Por factor de riesgo" datos={ind.porFactor.map(([k, n]) => [factorLabel(k), n])} color="#854F0B" />
        </View>
        <Text minPresenceAhead={70} style={st.seccion}>CUMPLIMIENTO POR RESPONSABLE</Text>
        <View style={{ flexDirection: 'row', backgroundColor: AZUL_OSC }}>
          {['Responsable', 'Total', 'Abiertos', 'Vencidos', 'Cerrados', '% cumpl.'].map((x, j) => <Text key={x} style={[st.th, { width: j === 0 ? 200 : 66 }]}>{x}</Text>)}
        </View>
        {ind.responsablesDetalle.map((x) => (
          <View key={x.nombre} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINEA }} wrap={false}>
            {[x.nombre, x.total, x.abiertos, x.vencidos, x.cerrados, `${Math.round((x.cerrados / x.total) * 100)}%`].map((v, j) =>
              <Text key={j} style={[st.td, { width: j === 0 ? 200 : 66, fontSize: 7, color: j === 3 && x.vencidos ? '#A32D2D' : '#222' }]}>{String(v)}</Text>)}
          </View>
        ))}
        <Text minPresenceAhead={70} style={st.seccion}>ACCIONES ABIERTAS AL CIERRE DEL PERIODO ({pendientes.length})</Text>
        {pendientes.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', borderBottomWidth: 0.4, borderBottomColor: LINEA, paddingVertical: 2, alignItems: 'center' }} wrap={false}>
            <Text style={{ width: 70, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{h.codigo}</Text>
            <View style={{ width: 62 }}><ChipPrioridad h={h} /></View>
            <Text style={{ flex: 1, fontSize: 6.8, paddingHorizontal: 4 }}>{h.obra_nombre}: {h.descripcion.slice(0, 120)}</Text>
            <Text style={{ width: 90, fontSize: 6.8 }}>{t(h.responsable_nombre)}</Text>
            <Text style={{ width: 52, fontSize: 6.8 }}>{fF(h.fecha_limite)}</Text>
            <View style={{ width: 62 }}><ChipEstado h={h} /></View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export const pdfHallazgo = (d: DetalleHallazgo, logo: Img) => renderToBuffer(<DocHallazgo d={d} logo={logo} />);
export const pdfMatriz = (r: ReporteMatriz, filtros: string, logo: Img) => renderToBuffer(<DocMatriz r={r} filtros={filtros} logo={logo} />);
export const pdfPeriodo = (r: ReporteMatriz, etiqueta: string, filtros: string, logo: Img) => renderToBuffer(<DocPeriodo r={r} etiqueta={etiqueta} filtros={filtros} logo={logo} />);
