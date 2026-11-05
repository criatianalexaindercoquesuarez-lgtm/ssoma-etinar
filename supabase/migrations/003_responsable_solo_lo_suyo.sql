-- ============================================================
-- SSOMA ETINAR — Migración 003: el responsable solo ve lo que se le asignó
--
-- Residente, Contratista y Bodeguero ven ÚNICAMENTE los hallazgos en los que
-- son responsables de ejecutar (o verificar), con su obra e inspección.
-- No ven el resto de hallazgos de la obra, ni de otras obras.
--
-- Jefe de Obra y Técnico SSO siguen viendo todos los hallazgos de su obra.
-- Administrador, Coordinador SST, Director y Auditor siguen viendo todo.
--
-- Ejecutar en Supabase → SQL Editor. Re-ejecutable.
-- ============================================================

-- Visibilidad por obra: solo roles de supervisión / SST asignados a esa obra
create or replace function auth_ve_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth_es_global()
      or exists (
        select 1 from perfiles pf
        where pf.id = auth.uid()
          and pf.rol in ('tecnico_sso', 'jefe_obra')
          and (pf.proyecto_id = p
               or exists (select 1 from perfil_proyectos pp where pp.perfil_id = pf.id and pp.proyecto_id = p))
      );
$$;

-- Inspecciones: además de la obra, el responsable ve la cabecera de las
-- inspecciones que contienen un hallazgo asignado a él (para su reporte).
drop policy if exists inspecciones_select on inspecciones;
create policy inspecciones_select on inspecciones for select using (
  auth_ve_proyecto(proyecto_id)
  or exists (select 1 from hallazgos h
             where h.inspeccion_id = inspecciones.id and not h.eliminado
               and (h.responsable_id = auth.uid() or h.verificador_id = auth.uid()))
);

-- Hallazgos (sin cambios en la regla, se recrea para dejarla explícita)
drop policy if exists hallazgos_select on hallazgos;
create policy hallazgos_select on hallazgos for select
  using (auth_ve_proyecto(proyecto_id) or responsable_id = auth.uid() or verificador_id = auth.uid());
