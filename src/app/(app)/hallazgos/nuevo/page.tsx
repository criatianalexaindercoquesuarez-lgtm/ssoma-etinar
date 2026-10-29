import { createClient } from '@/lib/supabase/server';
import NuevoHallazgoForm from './NuevoHallazgoForm';

export default async function NuevoHallazgoPage({ searchParams }: { searchParams: { inspeccion?: string } }) {
  const supabase = await createClient();
  const { data: inspecciones } = await supabase.from('inspecciones')
    .select('id,codigo,fecha_hora,area,ubicacion,nivel,frente,contratista,proyecto_id,proyectos(nombre)')
    .eq('eliminado', false).order('fecha_hora', { ascending: false }).limit(50);
  const { data: usuarios } = await supabase.from('perfiles').select('*').eq('activo', true).order('nombre');
  return (
    <NuevoHallazgoForm
      inspecciones={(inspecciones || []) as unknown as Parameters<typeof NuevoHallazgoForm>[0]['inspecciones']}
      usuarios={usuarios || []}
      inspeccionInicial={searchParams.inspeccion || inspecciones?.[0]?.id || ''}
    />
  );
}
