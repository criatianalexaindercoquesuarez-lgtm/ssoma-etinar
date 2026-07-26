import { createClient } from '@/lib/supabase/server';
import { NORMATIVAS } from '@/lib/types';
import AutoPrint from '@/components/AutoPrint';

export default async function ReportePage() {
  const supabase = await createClient();
  const { data: hallazgos } = await supabase.from('hallazgos').select('*').eq('eliminado', false).order('creado_en');
  const { data: perfiles } = await supabase.from('perfiles').select('id,nombre');
  const { data: evidencias } = await supabase.from('evidencias').select('hallazgo_id').eq('eliminado', false);
  const { data: proyectoRow } = await supabase.from('proyectos').select('nombre').limit(1).single();

  const hs = hallazgos || [];
  const cerrados = hs.filter((h) => h.estado === 'cerrado').length;
  const evidenciaSet = new Set((evidencias || []).map((e) => e.hallazgo_id));
  const colorMap: Record<string, string> = { critico: '#E24B4A', moderado: '#EF9F27', bajo: '#639922' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, fontSize: 11, color: '#222' }}>
      <AutoPrint />
      <div style={{ background: '#185FA5', color: '#fff', padding: 16, borderRadius: 8, marginBottom: 14 }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>Informe de Hallazgos — {proyectoRow?.nombre || 'Proyecto'}</h1>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          Generado: {new Date().toLocaleDateString('es-EC')} · Total: {hs.length} · Cerrados: {cerrados} (
          {Math.round((cerrados / (hs.length || 1)) * 100)}%)
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#185FA5', color: '#fff' }}>
            {['Código', 'Área', 'Hallazgo', 'Criticidad', 'Responsable', 'Avance', 'Estado', 'Normativa', 'Evidencia'].map((h) => (
              <th key={h} style={{ padding: 6, textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hs.map((h) => {
            const resp = perfiles?.find((p) => p.id === h.responsable_id);
            const normTxt = (h.normativa || []).map((n: string) => NORMATIVAS.find((x) => x.id === n)?.label).join(', ') || '—';
            const tieneEvidencia = evidenciaSet.has(h.id);
            return (
              <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '5px 6px', fontWeight: 700 }}>{h.codigo}</td>
                <td style={{ padding: '5px 6px' }}>{h.area}</td>
                <td style={{ padding: '5px 6px', fontSize: 10 }}>{h.descripcion.slice(0, 80)}</td>
                <td style={{ padding: '5px 6px', color: colorMap[h.criticidad], fontWeight: 700 }}>{h.criticidad}</td>
                <td style={{ padding: '5px 6px' }}>{resp?.nombre || '—'}</td>
                <td style={{ padding: '5px 6px' }}>{h.cumplimiento}%</td>
                <td style={{ padding: '5px 6px' }}>{h.estado}</td>
                <td style={{ padding: '5px 6px', fontSize: 9 }}>{normTxt}</td>
                <td style={{ padding: '5px 6px', fontSize: 9, color: tieneEvidencia ? '#3B6D11' : '#A32D2D', fontWeight: 700 }}>
                  {tieneEvidencia ? 'Sí' : 'Sin evidencia'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 20, fontSize: 9, color: '#999', borderTop: '1px solid #eee', paddingTop: 8 }}>
        ETINAR — Sistema SSOMA · Documento generado automáticamente
      </div>
    </div>
  );
}
