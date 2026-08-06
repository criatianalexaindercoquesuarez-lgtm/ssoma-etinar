'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CAUSAS, NORMATIVAS, Perfil } from '@/lib/types';

const AREAS = [
  'Estructura / Civil',
  'Eléctrico',
  'Andamios / Escaleras',
  'Bodega',
  'Oficinas',
  'Áreas exteriores',
  'Mecánica / Equipos',
];

export default function NuevoHallazgoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  
  // Estados del formulario
  const [proyectoId, setProyectoId] = useState('');
  const [area, setArea] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [criticidad, setCriticidad] = useState('Moderado');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [baseNormativa, setBaseNormativa] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [archivos, setArchivos] = useState<FileList | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      // Cargar lista de proyectos
      const { data: dataProyectos } = await supabase
        .from('proyectos')
        .select('id, nombre');
      if (dataProyectos) setProyectos(dataProyectos);

      // Cargar lista de usuarios / perfiles
      const { data: dataUsuarios } = await supabase
        .from('perfiles')
        .select('*');
      if (dataUsuarios) setUsuarios(dataUsuarios);
    };

    cargarDatosIniciales();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!proyectoId) {
      setErrorMsg('Por favor selecciona un proyecto.');
      setLoading(false);
      return;
    }

    try {
      // 1. Guardar hallazgo en Supabase
      const { data: hallazgo, error: insertError } = await supabase
        .from('hallazgos')
        .insert([
          {
            proyecto_id: proyectoId,
            area,
            descripcion,
            accion_correctiva: accionCorrectiva,
            criticidad,
            causa_raiz: causaRaiz,
            base_normativa: baseNormativa,
            responsable_id: responsableId || null,
            fecha_limite: fechaLimite || null,
            estado: 'En proceso',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Subir evidencias si existen
      if (archivos && archivos.length > 0 && hallazgo) {
        for (let i = 0; i < archivos.length; i++) {
          const file = archivos[i];
          const fileExt = file.name.split('.').pop();
          const filePath = `${hallazgo.id}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('evidencias')
            .upload(filePath, file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('evidencias')
              .getPublicUrl(filePath);

            await supabase.from('evidencias_hallazgos').insert([
              {
                hallazgo_id: hallazgo.id,
                url_foto: publicUrlData.publicUrl,
              },
            ]);
          }
        }
      }

      // Redirigir al listado o ficha del hallazgo
      router.push('/hallazgos');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el hallazgo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg shadow mt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Nuevo hallazgo</h1>

      {errorMsg && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          Error al guardar: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Proyecto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto *
          </label>
          <select
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar proyecto...</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Campo Área / Lugar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Área / Lugar *
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar...</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción del hallazgo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción del hallazgo *
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Acción correctiva */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Acción correctiva *
          </label>
          <textarea
            rows={3}
            value={accionCorrectiva}
            onChange={(e) => setAccionCorrectiva(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Criticidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Criticidad *
          </label>
          <select
            value={criticidad}
            onChange={(e) => setCriticidad(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Bajo">🟡 Bajo</option>
            <option value="Moderado">🟠 Moderado</option>
            <option value="Alto">🔴 Alto</option>
            <option value="Crítico">⛔ Crítico</option>
          </select>
        </div>

        {/* Causa raíz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Causa raíz
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAUSAS?.map((c: string) => (
              <button
                key={c}
                type="button"
                onClick={() => setCausaRaiz(c)}
                className={`p-2 border text-sm rounded-md text-center transition-colors ${
                  causaRaiz === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Base normativa aplicable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base normativa aplicable *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {NORMATIVAS?.map((n: string) => (
              <button
                key={n}
                type="button"
                onClick={() => setBaseNormativa(n)}
                className={`p-2 border text-sm rounded-md text-center transition-colors ${
                  baseNormativa === n
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Responsable de cierre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsable de cierre *
          </label>
          <select
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar...</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_completo || u.email}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha límite */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha límite *
          </label>
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Evidencia fotográfica */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Evidencia fotográfica
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setArchivos(e.target.files)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar y notificar responsable'}
        </button>
      </form>
    </div>
  );
}
