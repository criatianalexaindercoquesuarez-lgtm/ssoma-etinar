-- ============================================================
-- SSOMA ETINAR — Migración 002: Módulo completo de Matriz de Hallazgos
-- Inspecciones · Evaluación GTC-45 · Flujo de cierre · Firmas · Notificaciones
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de schema.sql.
-- Es re-ejecutable (usa IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Quitar políticas y funciones antiguas (se recrean abajo)
--    La función auth_rol() original no era SECURITY DEFINER y la
--    política de perfiles la llamaba → recursión infinita para no-admins.
-- ------------------------------------------------------------
drop policy if exists perfiles_select on perfiles;
drop policy if exists perfiles_update_self on perfiles;
drop policy if exists perfiles_admin_all on perfiles;
drop policy if exists proyectos_select on proyectos;
drop policy if exists proyectos_insert on proyectos;
drop policy if exists hallazgos_select on hallazgos;
drop policy if exists hallazgos_insert on hallazgos;
drop policy if exists hallazgos_update on hallazgos;
drop policy if exists evidencias_select on evidencias;
drop policy if exists evidencias_insert on evidencias;
drop policy if exists auditoria_select on auditoria;
drop policy if exists auditoria_insert on auditoria;
drop policy if exists notif_select on notificaciones;
drop policy if exists notif_insert on notificaciones;
drop function if exists auth_rol() cascade;
drop function if exists auth_proyecto() cascade;
-- (re-ejecución) objetos creados por esta misma migración
drop view if exists v_hallazgos;
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('perfiles','perfil_proyectos','proyectos','inspecciones','hallazgos',
                               'evidencias','auditoria','firmas','notificaciones')
  loop execute format('drop policy if exists %I on %I', r.policyname, r.tablename); end loop;
end $$;

-- ------------------------------------------------------------
-- 1. Tipos enumerados → texto con CHECK (más fácil de extender
--    a nuevas modalidades sin ALTER TYPE)
-- ------------------------------------------------------------
alter table perfiles alter column rol drop default;
alter table perfiles alter column rol type text using rol::text;
alter table perfiles alter column rol set default 'tecnico_sso';
alter table perfiles drop constraint if exists perfiles_rol_chk;
alter table perfiles add constraint perfiles_rol_chk check (rol in (
  'admin','coordinador_sst','tecnico_sso','jefe_obra','residente','contratista','bodeguero','director','auditor'));
alter table perfiles add column if not exists cargo text;
alter table perfiles add column if not exists empresa text;
alter table perfiles add column if not exists activo boolean not null default true;

drop index if exists idx_hallazgos_estado;
alter table hallazgos alter column estado drop default;
alter table hallazgos alter column estado type text using estado::text;
update hallazgos set estado = 'pendiente' where estado = 'abierto';
alter table hallazgos alter column estado set default 'pendiente';
alter table hallazgos drop constraint if exists hallazgos_estado_chk;
alter table hallazgos add constraint hallazgos_estado_chk
  check (estado in ('pendiente','en_proceso','en_verificacion','cerrado'));
create index if not exists idx_hallazgos_estado on hallazgos(estado) where not eliminado;

alter table auditoria alter column accion type text using accion::text;
alter table auditoria alter column estado_snapshot type text using estado_snapshot::text;
update auditoria set estado_snapshot = 'pendiente' where estado_snapshot = 'abierto';
alter table auditoria add column if not exists estado_anterior text;
alter table auditoria add column if not exists datos jsonb;

-- ------------------------------------------------------------
-- 2. Obras: código de proyecto + asignación de usuarios a varias obras
-- ------------------------------------------------------------
alter table proyectos add column if not exists codigo text;
create unique index if not exists proyectos_codigo_uk on proyectos(codigo) where codigo is not null;

create table if not exists perfil_proyectos (
  perfil_id uuid not null references perfiles(id) on delete cascade,
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  primary key (perfil_id, proyecto_id)
);

-- ------------------------------------------------------------
-- 3. Contadores atómicos para códigos correlativos
-- ------------------------------------------------------------
create table if not exists contadores (
  clave text primary key,
  valor integer not null default 0
);

create or replace function siguiente_numero(p_clave text) returns integer
language sql volatile security definer set search_path = public as $$
  insert into contadores(clave, valor) values (p_clave, 1)
  on conflict (clave) do update set valor = contadores.valor + 1
  returning valor;
$$;

-- ------------------------------------------------------------
-- 4. INSPECCIONES (cabecera de la matriz). La columna "modalidad"
--    permite agregar luego inspecciones planeadas, auditorías, etc.
--    reutilizando hallazgos, seguimiento, evidencias, notificaciones y cierre.
-- ------------------------------------------------------------
create table if not exists inspecciones (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id),
  modalidad text not null default 'no_planeada',
  codigo text unique,
  fecha_hora timestamptz not null default now(),
  inspector_id uuid references perfiles(id),
  area text,
  ubicacion text,
  nivel text,
  frente text,
  contratista text,
  observaciones text,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  eliminado boolean not null default false
);
create index if not exists idx_inspecciones_proyecto on inspecciones(proyecto_id) where not eliminado;

create or replace function trg_inspeccion_codigo() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_obra text; v_anio text; n int;
begin
  if new.codigo is null or new.codigo = '' then
    select coalesce(nullif(codigo,''), 'OBRA') into v_obra from proyectos where id = new.proyecto_id;
    v_anio := to_char(coalesce(new.fecha_hora, now()) at time zone 'America/Guayaquil', 'YYYY');
    n := siguiente_numero('INS-' || v_obra || '-' || v_anio);
    new.codigo := 'INS-' || v_obra || '-' || v_anio || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
drop trigger if exists inspeccion_codigo on inspecciones;
create trigger inspeccion_codigo before insert on inspecciones
  for each row execute function trg_inspeccion_codigo();

-- ------------------------------------------------------------
-- 5. HALLAZGOS: campos completos del requerimiento
-- ------------------------------------------------------------
alter table hallazgos
  add column if not exists inspeccion_id uuid references inspecciones(id),
  add column if not exists ubicacion text,
  add column if not exists nivel text,
  add column if not exists frente text,
  add column if not exists contratista text,
  add column if not exists tipo_desviacion text,
  add column if not exists peligro text,
  add column if not exists factor_riesgo text,
  add column if not exists consecuencias text,
  add column if not exists trabajadores_expuestos integer,
  add column if not exists personas_afectadas integer,
  -- GTC-45
  add column if not exists nd smallint,
  add column if not exists ne smallint,
  add column if not exists nc smallint,
  add column if not exists np smallint,
  add column if not exists nr integer,
  add column if not exists nivel_riesgo text,
  add column if not exists prioridad text,
  -- Medidas
  add column if not exists accion_inmediata text,
  add column if not exists medida_preventiva text,
  add column if not exists verificador_id uuid references perfiles(id),
  add column if not exists fecha_asignacion date not null default current_date,
  add column if not exists recibido_en timestamptz,
  -- Seguimiento y cierre
  add column if not exists fecha_ejecucion date,
  add column if not exists acciones_implementadas text,
  add column if not exists observaciones_responsable text,
  add column if not exists verificacion_resultado text,
  add column if not exists cierre_aprobado boolean,
  add column if not exists motivo_rechazo text,
  add column if not exists fecha_cierre timestamptz,
  add column if not exists reincidente_de uuid references hallazgos(id);

alter table hallazgos drop constraint if exists hallazgos_tipo_chk;
alter table hallazgos add constraint hallazgos_tipo_chk
  check (tipo_desviacion is null or tipo_desviacion in ('condicion_insegura','acto_inseguro'));
alter table hallazgos drop constraint if exists hallazgos_gtc45_chk;
alter table hallazgos add constraint hallazgos_gtc45_chk check (
  (nd is null or nd in (0,2,6,10)) and (ne is null or ne between 1 and 4) and (nc is null or nc in (10,25,60,100)));
alter table hallazgos drop constraint if exists hallazgos_prioridad_chk;
alter table hallazgos add constraint hallazgos_prioridad_chk
  check (prioridad is null or prioridad in ('critica','alta','media','baja'));
create index if not exists idx_hallazgos_inspeccion on hallazgos(inspeccion_id);
create index if not exists idx_hallazgos_responsable on hallazgos(responsable_id) where not eliminado;

-- Cálculo GTC-45 + código + reincidencia + compatibilidad con "criticidad"
create or replace function trg_hallazgo_calculos() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_obra text; n int; v_prev uuid;
begin
  -- Código correlativo por obra: H-<OBRA>-0001
  if tg_op = 'INSERT' and (new.codigo is null or new.codigo = '') then
    select coalesce(nullif(codigo,''), 'OBRA') into v_obra from proyectos where id = new.proyecto_id;
    n := siguiente_numero('H-' || v_obra);
    new.codigo := 'H-' || v_obra || '-' || lpad(n::text, 4, '0');
  end if;

  -- GTC-45: NP = ND × NE ; NR = NP × NC
  if new.nd is not null and new.ne is not null and new.nc is not null then
    new.np := new.nd * new.ne;
    new.nr := new.np * new.nc;
    new.nivel_riesgo := case
      when new.nr >= 600 then 'I'
      when new.nr >= 150 then 'II'
      when new.nr >= 40  then 'III'
      else 'IV' end;
    new.prioridad := case new.nivel_riesgo
      when 'I' then 'critica' when 'II' then 'alta' when 'III' then 'media' else 'baja' end;
  elsif new.prioridad is null then
    new.prioridad := case new.criticidad when 'critico' then 'alta' when 'moderado' then 'media' else 'baja' end;
  end if;
  new.criticidad := case new.prioridad
    when 'critica' then 'critico' when 'alta' then 'critico' when 'media' then 'moderado' else 'bajo' end;

  -- Reincidencia: misma obra, mismo factor de riesgo y misma área en los últimos 180 días
  if tg_op = 'INSERT' and new.factor_riesgo is not null then
    select id into v_prev from hallazgos
     where proyecto_id = new.proyecto_id and not eliminado
       and factor_riesgo = new.factor_riesgo and area = new.area
       and creado_en > now() - interval '180 days'
     order by creado_en desc limit 1;
    new.reincidente_de := v_prev;
  end if;

  new.actualizado_en := now();
  return new;
end $$;
drop trigger if exists hallazgo_calculos on hallazgos;
create trigger hallazgo_calculos before insert or update on hallazgos
  for each row execute function trg_hallazgo_calculos();

-- Hallazgos anteriores: asignar prioridad a partir de su criticidad
update hallazgos set prioridad = null where prioridad is null;

-- ------------------------------------------------------------
-- 6. Evidencias con descripción
-- ------------------------------------------------------------
alter table evidencias add column if not exists descripcion text;
alter table evidencias drop constraint if exists evidencias_tipo_chk;
alter table evidencias add constraint evidencias_tipo_chk check (tipo in ('apertura','avance','cierre'));

-- ------------------------------------------------------------
-- 7. FIRMAS / VALIDACIONES (solo inserción)
-- ------------------------------------------------------------
create table if not exists firmas (
  id uuid primary key default gen_random_uuid(),
  hallazgo_id uuid references hallazgos(id),
  inspeccion_id uuid references inspecciones(id),
  tipo text not null check (tipo in ('elaboracion','recepcion','ejecucion','verificacion')),
  usuario_id uuid references perfiles(id),
  nombre text not null,
  cargo text,
  rol text,
  firma_path text,           -- imagen de la firma manuscrita en Storage (opcional)
  creado_en timestamptz not null default now()
);
create index if not exists idx_firmas_hallazgo on firmas(hallazgo_id);

-- ------------------------------------------------------------
-- 8. NOTIFICACIONES: evento, contenido y bandeja interna
-- ------------------------------------------------------------
alter table notificaciones
  add column if not exists evento text,
  add column if not exists clave text,
  add column if not exists destinatario_email text,
  add column if not exists asunto text,
  add column if not exists cuerpo text,
  add column if not exists leida boolean not null default false,
  add column if not exists actor_id uuid references perfiles(id);
create index if not exists idx_notif_dest on notificaciones(destinatario_id, leida);
create index if not exists idx_notif_clave on notificaciones(hallazgo_id, clave);

-- ------------------------------------------------------------
-- 9. Funciones de seguridad (SECURITY DEFINER: sin recursión de RLS)
-- ------------------------------------------------------------
create or replace function auth_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function auth_es_global() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin','coordinador_sst','director','auditor') from perfiles where id = auth.uid()), false);
$$;

create or replace function auth_es_sst() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin','coordinador_sst','tecnico_sso') from perfiles where id = auth.uid()), false);
$$;

create or replace function auth_ve_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth_es_global()
      or exists (select 1 from perfiles where id = auth.uid() and proyecto_id = p)
      or exists (select 1 from perfil_proyectos where perfil_id = auth.uid() and proyecto_id = p);
$$;

create or replace function auth_ve_hallazgo(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hallazgos x where x.id = h and (
    auth_ve_proyecto(x.proyecto_id) or x.responsable_id = auth.uid() or x.verificador_id = auth.uid()));
$$;

-- Bloqueo en BD: solo SST puede aprobar el cierre (aunque se use la API directa)
create or replace function trg_hallazgo_guardia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.estado = 'cerrado' and old.estado is distinct from 'cerrado'
     and not (auth_es_sst() or new.verificador_id = auth.uid()) then
    raise exception 'Solo SST o el verificador asignado pueden aprobar el cierre';
  end if;
  return new;
end $$;
drop trigger if exists hallazgo_guardia on hallazgos;
create trigger hallazgo_guardia before update on hallazgos
  for each row execute function trg_hallazgo_guardia();

-- ------------------------------------------------------------
-- 10. RLS
-- ------------------------------------------------------------
alter table inspecciones enable row level security;
alter table firmas enable row level security;
alter table perfil_proyectos enable row level security;
alter table contadores enable row level security;

-- Perfiles: todos los usuarios autenticados ven el directorio (para asignar responsables)
create policy perfiles_select on perfiles for select using (auth.uid() is not null);
create policy perfiles_update_self on perfiles for update using (id = auth.uid() or auth_rol() = 'admin');
create policy perfiles_admin_insert on perfiles for insert with check (auth_rol() = 'admin');

create policy pp_select on perfil_proyectos for select using (auth.uid() is not null);
create policy pp_admin on perfil_proyectos for all using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

create policy proyectos_select on proyectos for select using (auth.uid() is not null);
create policy proyectos_insert on proyectos for insert
  with check (auth_rol() in ('admin','director','coordinador_sst','tecnico_sso'));
create policy proyectos_update on proyectos for update
  using (auth_rol() in ('admin','director','coordinador_sst'));

create policy inspecciones_select on inspecciones for select using (auth_ve_proyecto(proyecto_id));
create policy inspecciones_insert on inspecciones for insert with check (auth_ve_proyecto(proyecto_id));
create policy inspecciones_update on inspecciones for update using (auth_ve_proyecto(proyecto_id));

create policy hallazgos_select on hallazgos for select
  using (auth_ve_proyecto(proyecto_id) or responsable_id = auth.uid() or verificador_id = auth.uid());
create policy hallazgos_insert on hallazgos for insert with check (auth_ve_proyecto(proyecto_id));
create policy hallazgos_update on hallazgos for update
  using (auth_ve_proyecto(proyecto_id) or responsable_id = auth.uid() or verificador_id = auth.uid());
-- Sin política DELETE: el borrado es lógico (eliminado = true).

create policy evidencias_select on evidencias for select using (auth_ve_hallazgo(hallazgo_id));
create policy evidencias_insert on evidencias for insert with check (auth_ve_hallazgo(hallazgo_id));

create policy auditoria_select on auditoria for select using (auth_ve_hallazgo(hallazgo_id));
create policy auditoria_insert on auditoria for insert with check (auth_ve_hallazgo(hallazgo_id));

create policy firmas_select on firmas for select using (
  (hallazgo_id is not null and auth_ve_hallazgo(hallazgo_id))
  or (inspeccion_id is not null and exists (select 1 from inspecciones i where i.id = inspeccion_id and auth_ve_proyecto(i.proyecto_id))));
create policy firmas_insert on firmas for insert with check (usuario_id = auth.uid());

create policy notif_select on notificaciones for select
  using (destinatario_id = auth.uid() or (hallazgo_id is not null and auth_ve_hallazgo(hallazgo_id)));
create policy notif_insert on notificaciones for insert with check (auth.uid() is not null);
create policy notif_update_propia on notificaciones for update using (destinatario_id = auth.uid());

-- ------------------------------------------------------------
-- 11. Vista consolidada de la matriz (respeta RLS del usuario)
-- ------------------------------------------------------------
drop view if exists v_hallazgos;
create view v_hallazgos with (security_invoker = true) as
select
  h.*,
  p.nombre  as obra_nombre,
  p.codigo  as obra_codigo,
  i.codigo  as inspeccion_codigo,
  i.fecha_hora as inspeccion_fecha,
  i.modalidad as modalidad,
  ins.nombre as inspector_nombre,
  r.nombre  as responsable_nombre,
  r.email   as responsable_email,
  coalesce(r.cargo, r.rol) as responsable_cargo,
  v.nombre  as verificador_nombre,
  coalesce(v.cargo, v.rol) as verificador_cargo,
  c.nombre  as creador_nombre,
  case
    when h.estado in ('pendiente','en_proceso') and h.fecha_limite < (now() at time zone 'America/Guayaquil')::date
      then 'vencido'
    else h.estado end as estado_efectivo,
  case when h.fecha_cierre is not null
    then round(extract(epoch from (h.fecha_cierre - h.creado_en)) / 86400.0, 1) end as dias_cierre,
  ((now() at time zone 'America/Guayaquil')::date - h.fecha_limite) as dias_vencido,
  exists (select 1 from evidencias e where e.hallazgo_id = h.id and not e.eliminado and e.tipo = 'cierre') as tiene_evidencia_cierre,
  (select count(*) from evidencias e where e.hallazgo_id = h.id and not e.eliminado) as total_evidencias
from hallazgos h
join proyectos p on p.id = h.proyecto_id
left join inspecciones i on i.id = h.inspeccion_id
left join perfiles ins on ins.id = i.inspector_id
left join perfiles r on r.id = h.responsable_id
left join perfiles v on v.id = h.verificador_id
left join perfiles c on c.id = h.creado_por
where not h.eliminado;

grant select on v_hallazgos to authenticated;

-- ------------------------------------------------------------
-- 12. Realtime
-- ------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table evidencias; exception when others then null; end;
  begin alter publication supabase_realtime add table firmas; exception when others then null; end;
end $$;
