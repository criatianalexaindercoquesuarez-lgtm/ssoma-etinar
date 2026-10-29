import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { obtenerInspeccion, obtenerMatriz } from '@/lib/matriz';
import { fmtFechaHora } from '@/lib/types';
import { modalidadLabel } from '@/lib/modalidades';
import { Card, Row, SectionTitle } from '@/components/ui';
import HallazgoCard from '@/components/HallazgoCard';

export default async function InspeccionDetalle({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const insp = await obtenerInspeccion(supabase, params.id);
  if (!insp) notFound();
  const hs = await obtenerMatriz(supabase, { inspeccion: params.id });
  const q = `inspeccion=${params.id}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-base font-semibold">{insp.codigo}</h2>
        <div className="flex gap-2">
          <a href={`/api/export/matriz.pdf?${q}`} className="text-xs bg-[#F1EFE8] px-3 py-2 rounded-lg text-[#0C447C] font-medium">⬇ Matriz PDF</a>
          <a href={`/api/export/matriz.xlsx?${q}`} className="text-xs bg-[#F1EFE8] px-3 py-2 rounded-lg text-[#3B6D11] font-medium">⬇ Excel</a>
        </div>
      </div>
      <Card>
        <SectionTitle n="A">Datos generales</SectionTitle>
        <Row label="Obra" value={`${insp.proyectos?.codigo ? insp.proyectos.codigo + ' — ' : ''}${insp.proyectos?.nombre}`} />
        <Row label="Modalidad" value={modalidadLabel(insp.modalidad)} />
        <Row label="Fecha y hora" value={fmtFechaHora(insp.fecha_hora)} />
        <Row label="Inspector" value={insp.inspector?.nombre} />
        <Row label="Área / ubicación" value={[insp.area, insp.ubicacion].filter(Boolean).join(' · ')} />
        <Row label="Nivel / frente" value={[insp.nivel, insp.frente].filter(Boolean).join(' · ')} />
        <Row label="Contratista" value={insp.contratista} />
        <Row label="Observaciones" value={insp.observaciones} />
      </Card>
      <div className="flex justify-between items-center pt-1">
        <h3 className="text-sm font-semibold">Hallazgos de la inspección ({hs.length})</h3>
        <Link href={`/hallazgos/nuevo?inspeccion=${insp.id}`} className="bg-[#185FA5] text-white text-sm font-medium px-4 py-2 rounded-lg">+ Agregar hallazgo</Link>
      </div>
      {hs.length === 0 && <p className="text-sm text-[#5F5E5A] text-center py-6">Sin hallazgos. Agregue el primero.</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        {hs.map((h) => <HallazgoCard key={h.id} h={h} mostrarObra={false} />)}
      </div>
    </div>
  );
}
