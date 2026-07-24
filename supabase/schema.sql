-- ============================================================
-- SSOMA ETINAR — Esquema Supabase
-- Matriz de Hallazgos y Evidencias
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ===================== ENUM TYPES =====================
create type rol_usuario as enum ('admin','tecnico_sso','residente','bodeguero','director','auditor');
create type criticidad_hallazgo as enum ('critico','moderado','bajo');
create type estado_hallazgo as enum ('abierto','en_proceso','cerrado');
create type accion_auditoria as enum ('crear','avance','cerrar','editar','archivar');

-- ===================== PROYECTOS =====================
create table proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ubicacion text,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  activo boolean not null default true
);

-- ===================== PERFILES (extiende auth.users) =====================
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text,
  telefono text,
  rol rol_usuario not null default 'tecnico_sso',
  proyecto_id uuid references proyectos(id),
  creado_en timestamptz not null default now()
);

-- ===================== HALLAZGOS =====================
create table hallazgos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id),
  codigo text not null,
  area text not null,
  descripcion text not null,
  accion_correctiva text not null,
  criticidad criticidad_hallazgo not null default 'moderado',
  estado estado_hallazgo not null default 'abierto',
  cumplimiento smallint not null default 0 check (cumplimiento between 0 and 100),
  causas text[] not null default '{}',
  normativa text[] not null default '{}',
  responsable_id uuid references perfiles(id),
  creado_por uuid references perfiles(id),
  fecha_limite date not null,
  observaciones text,
  eliminado boolean not null default false,   -- SOFT DELETE, nunca hard-delete
  eliminado_en timestamptz,
  eliminado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (proyecto_id, codigo)
);

create index idx_hallazgos_proyecto on hallazgos(proyecto_id) where not eliminado;
create index idx_hallazgos_estado on hallazgos(estado) where not eliminado;

-- ===================== EVIDENCIAS FOTOGRÁFICAS =====================
create table evidencias (
  id uuid primary key default gen_random_uuid(),
  hallazgo_id uuid not null references hallazgos(id),
  storage_path text not null,     -- ruta en Supabase Storage bucket 'evidencias'
  tipo text not null default 'apertura', -- 'apertura' | 'avance' | 'cierre'
  subido_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  eliminado boolean not null default false
);

-- ===================== AUDITORÍA (INMUTABLE, APPEND-ONLY) =====================
create table auditoria (
  id uuid primary key default gen_random_uuid(),
  hallazgo_id uuid not null references hallazgos(id),
  accion accion_auditoria not null,
  usuario_id uuid references perfiles(id),
  detalle text,
  cumplimiento_snapshot smallint,
  estado_snapshot estado_hallazgo,
  creado_en timestamptz not null default now()
);

-- ===================== NOTIFICACIONES =====================
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  hallazgo_id uuid references hallazgos(id),
  destinatario_id uuid references perfiles(id),
  canal text not null,  -- 'email' | 'whatsapp'
  estado text not null default 'enviado',
  creado_en timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table proyectos enable row level security;
alter table perfiles enable row level security;
alter table hallazgos enable row level security;
alter table evidencias enable row level security;
alter table auditoria enable row level security;
alter table notificaciones enable row level security;

-- Helper: rol del usuario autenticado
create or replace function auth_rol() returns rol_usuario
language sql stable as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function auth_proyecto() returns uuid
language sql stable as $$
  select proyecto_id from perfiles where id = auth.uid();
$$;

-- Perfiles: cada quien ve su propio perfil; admin ve todos
create policy perfiles_select on perfiles for select
  using (id = auth.uid() or auth_rol() = 'admin');
create policy perfiles_update_self on perfiles for update
  using (id = auth.uid());
create policy perfiles_admin_all on perfiles for insert
  with check (auth_rol() = 'admin');

-- Proyectos: visibles para todos los usuarios autenticados de ese proyecto
create policy proyectos_select on proyectos for select
  using (true);
create policy proyectos_insert on proyectos for insert
  with check (auth_rol() in ('admin','director'));

-- Hallazgos: visibles solo dentro del mismo proyecto, nunca si eliminado=true se borra realmente
create policy hallazgos_select on hallazgos for select
  using (proyecto_id = auth_proyecto() or auth_rol() = 'admin');
create policy hallazgos_insert on hallazgos for insert
  with check (proyecto_id = auth_proyecto());
create policy hallazgos_update on hallazgos for update
  using (proyecto_id = auth_proyecto())
  with check (proyecto_id = auth_proyecto());
-- IMPORTANTE: no existe policy de DELETE -> hard-delete queda bloqueado a nivel de base de datos.
-- El "borrado" siempre se hace marcando eliminado=true (update), preservando el historial de auditoría.

-- Evidencias
create policy evidencias_select on evidencias for select
  using (exists (select 1 from hallazgos h where h.id = hallazgo_id and h.proyecto_id = auth_proyecto()));
create policy evidencias_insert on evidencias for insert
  with check (exists (select 1 from hallazgos h where h.id = hallazgo_id and h.proyecto_id = auth_proyecto()));

-- Auditoría: SOLO INSERT y SELECT. Nunca UPDATE ni DELETE -> tabla verdaderamente inmutable.
create policy auditoria_select on auditoria for select
  using (exists (select 1 from hallazgos h where h.id = hallazgo_id and h.proyecto_id = auth_proyecto()));
create policy auditoria_insert on auditoria for insert
  with check (exists (select 1 from hallazgos h where h.id = hallazgo_id and h.proyecto_id = auth_proyecto()));

-- Notificaciones
create policy notif_select on notificaciones for select
  using (exists (select 1 from hallazgos h where h.id = hallazgo_id and h.proyecto_id = auth_proyecto()));
create policy notif_insert on notificaciones for insert
  with check (true);

-- ============================================================
-- REALTIME: activar explícitamente (no basta con el frontend)
-- ============================================================
alter publication supabase_realtime add table hallazgos;
alter publication supabase_realtime add table auditoria;
alter publication supabase_realtime add table notificaciones;

-- ============================================================
-- STORAGE BUCKET para evidencias (ejecutar en el dashboard si esto falla aquí)
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('evidencias', 'evidencias', true)
  on conflict (id) do nothing;

create policy storage_evidencias_select on storage.objects for select
  using (bucket_id = 'evidencias');
create policy storage_evidencias_insert on storage.objects for insert
  with check (bucket_id = 'evidencias' and auth.role() = 'authenticated');
