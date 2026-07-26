import { createClient } from '@/lib/supabase/server';
import { CAUSAS, NORMATIVAS } from '@/lib/types';
import AutoPrint from '@/components/AutoPrint';
import { notFound } from 'next/navigation';

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: h } = await supabase.from('hallazgos').select('*').eq('id', id).single();
  if (!h) notFound();

  const { data: resp } = await supabase.from('perfiles').select('nombre').eq('id', h.responsable_id).single();
  const { data: proyectoRow } = await supabase.from('proyectos').select('nombre').eq('id', h.proyecto_id).single();
  const { data: evidencias } = await supabase.from('evidencias').select('*').eq('hallazgo_id', id).eq('eliminado', false);

  const fotos = (evidencias || []).map(
    (e) => supabase.storage.from('evidencias').getPublicUrl(e.storage_path).data.publicUrl
  );

  const colorMap: Record<string, string> = { critico: '#E24B4A', moderado: '#EF9F27', bajo: '#639922' };
  const labelMap: Record<string, string> = { critico: 'CRÍTICO', moderado: 'MODERADO', bajo: 'BAJO' };
  const causas = (h.causas || []).map((c: string) => CAUSAS.find((x) => x.id === c)?.label).join(', ') || '—';
  const normativas = (h.normativa || []).map((n: string) => NORMATIVAS.find((x) => x.id === n)?.label).join(', ') || '—';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, fontSize: 13, color: '#333' }}>
      <AutoPrint />
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #185FA5', paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#185FA5' }}>ETINAR</div>
          <h1 style={{ fontSize: 18, color: '#185FA5', margin: 0 }}>SSOMA — Ficha de Hallazgo</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{h.codigo}</div>
          <div>{new Date().toLocaleDateString('es-EC')}</div>
        </div>
      </div>

      <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 14, color: '#fff', fontWeight: 700, background: colorMap[h.criticidad] }}>
        {labelMap[h.criticidad]}
      </span>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, marginBottom: 14 }}>
        <tbody>
          {[
            ['Proyecto', proyectoRow?.nombre || '—'],
            ['Área', h.area],
            ['Responsable', resp?.nombre || '—'],
            ['Estado', h.estado],
            ['Cumplimiento', `${h.cumplimiento}%`],
            ['Cierre límite', new Date(h.fecha_limite).toLocaleDateString('es-EC')],
            ['Causa raíz', causas],
            ['Base normativa', normativas],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: '6px 8px', border: '1px solid #eee', fontWeight: 600, background: '#f9f9f9', width: '35%' }}>{label}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #eee' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#185FA5', fontWeight: 700, margin: '14px 0 6px' }}>
        Descripción del hallazgo
      </div>
      <div style={{ padding: 10, borderRadius: 6, marginBottom: 12, background: '#FCEBEB', borderLeft: '4px solid #E24B4A', lineHeight: 1.5 }}>
        {h.descripcion}
      </div>

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#185FA5', fontWeight: 700, margin: '14px 0 6px' }}>
        Acción correctiva
      </div>
      <div style={{ padding: 10, borderRadius: 6, marginBottom: 12, background: '#EAF3DE', borderLeft: '4px solid #639922', lineHeight: 1.5 }}>
        {h.accion_correctiva}
      </div>

      {h.observaciones && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#185FA5', fontWeight: 700, margin: '14px 0 6px' }}>
            Observaciones
          </div>
          <div style={{ padding: 10, borderRadius: 6, marginBottom: 12, background: '#f5f5f3', lineHeight: 1.5 }}>{h.observaciones}</div>
        </>
      )}

      {fotos.length > 0 && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#185FA5', fontWeight: 700, margin: '14px 0 6px' }}>
            Evidencia fotográfica
          </div>
          <div>
            {fotos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="evidencia" style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', margin: 3 }} />
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 30, fontSize: 10, color: '#999', borderTop: '1px solid #eee', paddingTop: 8 }}>
        ETINAR — Sistema SSOMA · Documento generado automáticamente
      </div>
    </div>
  );
}
