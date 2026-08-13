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

const PROYECTOS_PREDETERMINADOS = [
  'Maxximus',
  'Millennium Park',
  'Hospital Machala / Med',
  'Titanio',
  'Ágora',
  'Terranostra',
  'Máximo',
  'Santo Domingo',
  'Gran Bay Manta',
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

  useEffect(() => {
    async function cargarDatos() {
      const { data: projData } = await supabase.from('proyectos').select('*');
      if (projData && projData.length > 0) {
        setProyectos(projData);
      } else {
        setProyectos(PROYECTOS_PREDETERMINADOS.map((p, i) => ({ id: p, nombre: p })));
      }
    }
    cargarDatos();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">Nuevo hallazgo</h1>

      <form className="space-y-4">
        {/* Desplegable de Proyecto */}
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
            <option value="">Seleccione un proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Desplegable de Área / Lugar */}
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
            <option value="">Seleccione un área</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción del hallazgo *
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
            required
          />
        </div>

        {/* Acción correctiva */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Acción correctiva *
          </label>
          <textarea
            value={accionCorrectiva}
            onChange={(e) => setAccionCorrectiva(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
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
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="Bajo">🟢 Bajo</option>
            <option value="Moderado">🟡 Moderado</option>
            <option value="Alto">🔴 Alto</option>
          </select>
        </div>
      </form>
    </div>
  );
}
