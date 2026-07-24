-- ============================================================
--  BSC INTEGRAL · Esquema de base de datos para Supabase
--  ------------------------------------------------------------
--  Cómo usarlo:
--    1. Entra a supabase.com → tu proyecto → SQL Editor
--    2. Pega TODO este archivo y presiona "Run"
--    3. Ve a Authentication → Users → Add user y crea una
--       cuenta (correo + contraseña) para cada responsable
--    4. Pon tus claves en el archivo .env del proyecto y corre  npm run dev
--
--  Seguridad: solo usuarios con sesión iniciada pueden leer o
--  escribir. Sin cuenta no se ve nada, aunque alguien tenga la
--  llave anónima.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLAS
-- ------------------------------------------------------------

create table if not exists bsc_empresa (
  id          int primary key default 1,
  nombre      text not null default 'Mi Empresa',
  actualizado timestamptz not null default now(),
  constraint bsc_empresa_unica check (id = 1)
);

create table if not exists bsc_perspectivas (
  id          text primary key,
  nombre      text not null,
  color       text,
  icono       text,
  orden       int default 1,
  descripcion text default '',
  actualizado timestamptz not null default now()
);

create table if not exists bsc_usuarios (
  id          text primary key,
  nombre      text not null,
  iniciales   text,
  actualizado timestamptz not null default now()
);

-- Cuentas de acceso (correo/contraseña reales viven en Supabase Authentication).
-- Esta tabla solo guarda ROL y PERMISOS por correo.
create table if not exists bsc_perfiles (
  id          uuid unique references auth.users(id) on delete cascade, -- se llena solo al primer inicio de sesión
  email       text primary key,
  nombre      text not null default '',
  rol         text not null default 'lector' check (rol in ('admin','capturista','lector')),
  usuario_id  text references bsc_usuarios(id) on delete set null,     -- responsable vinculado (para "capturista")
  vistas      text[] not null default '{}',                            -- vacío = usar las vistas por defecto del rol
  activo      boolean not null default true,
  actualizado timestamptz not null default now()
);

create table if not exists bsc_objetivos (
  id             text primary key,
  perspectiva_id text references bsc_perspectivas(id) on delete set null,
  nombre         text not null,
  actualizado    timestamptz not null default now()
);

create table if not exists bsc_relaciones (
  id          text primary key,          -- formato: causa|efecto
  causa_id    text references bsc_objetivos(id) on delete cascade,
  efecto_id   text references bsc_objetivos(id) on delete cascade,
  actualizado timestamptz not null default now()
);

create table if not exists bsc_indicadores (
  id               text primary key,
  nombre           text not null,
  perspectiva_id   text references bsc_perspectivas(id) on delete set null,
  objetivo_id      text references bsc_objetivos(id)    on delete set null,
  responsable_id   text references bsc_usuarios(id)     on delete set null,
  unidad           text default '',
  direccion        text default 'up',      -- up | down | monitor
  meta             numeric,
  frecuencia       text default 'mensual', -- diaria|semanal|mensual|trimestral|anual
  visualizacion    text default 'auto',
  peso             numeric default 1,
  umbral_verde     numeric default 95,
  umbral_amarillo  numeric default 80,
  descripcion      text default '',
  activo           boolean default true,
  actualizado      timestamptz not null default now()
);

create table if not exists bsc_mediciones (
  id            text primary key,         -- formato: indicador|periodo
  indicador_id  text references bsc_indicadores(id) on delete cascade,
  periodo       text not null,            -- 2026-07 | 2026-T3 | 2026-S28 | 2026-07-14
  valor         numeric,
  capturo       text,                     -- id del responsable en bsc_usuarios
  nota          text default '',
  fecha         timestamptz default now(),
  actualizado   timestamptz not null default now(),
  unique (indicador_id, periodo)
);

-- Índices para consultas rápidas
create index if not exists idx_med_indicador on bsc_mediciones (indicador_id);
create index if not exists idx_med_periodo   on bsc_mediciones (periodo);
create index if not exists idx_ind_persp     on bsc_indicadores (perspectiva_id);
create index if not exists idx_ind_resp      on bsc_indicadores (responsable_id);

-- ------------------------------------------------------------
-- 2. SELLO AUTOMÁTICO DE ACTUALIZACIÓN
-- ------------------------------------------------------------
create or replace function bsc_touch()
returns trigger language plpgsql as $$
begin
  new.actualizado = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['bsc_empresa','bsc_perspectivas','bsc_usuarios','bsc_objetivos',
                           'bsc_relaciones','bsc_indicadores','bsc_mediciones','bsc_perfiles']
  loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s', t);
    execute format('create trigger trg_touch_%1$s before update on %1$s
                    for each row execute function bsc_touch()', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. SEGURIDAD (RLS): base para todas las tablas, solo autenticados
--    (la sección 3.1 la vuelve más estricta para escritura)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['bsc_empresa','bsc_perspectivas','bsc_usuarios','bsc_objetivos',
                           'bsc_relaciones','bsc_indicadores','bsc_mediciones']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "acceso_autenticado" on %I', t);
    execute format($f$create policy "acceso_autenticado" on %I
                      for all to authenticated using (true) with check (true)$f$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3.1 USUARIOS, CONTRASEÑAS Y RESTRICCIONES DE VISTA/CAPTURA
--    Las contraseñas viven en Supabase Authentication (no aquí).
--    Roles: admin (todo) · capturista (solo sus indicadores) · lector (solo ver)
-- ------------------------------------------------------------

-- ¿El usuario que hace la consulta es administrador? (bypassa RLS a propósito,
-- de forma controlada, para poder responder esto sin caer en recursión)
create or replace function bsc_es_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from bsc_perfiles where id = auth.uid() and rol = 'admin' and activo);
$$;
grant execute on function bsc_es_admin() to authenticated;

-- ¿Puede el usuario capturar mediciones de este indicador? (solo su propio responsable)
create or replace function bsc_puede_capturar(p_indicador text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from bsc_perfiles pf
    join bsc_indicadores i on i.id = p_indicador
    where pf.id = auth.uid() and pf.activo and pf.rol = 'capturista' and i.responsable_id = pf.usuario_id
  );
$$;
grant execute on function bsc_puede_capturar(text) to authenticated;

-- Enlaza automáticamente (por correo) la cuenta de Authentication con su fila de
-- bsc_perfiles al iniciar sesión. Si nadie la registró antes, crea una de rol
-- "lector" (el más restringido) para que nunca quede sin fila de permisos.
create or replace function bsc_vincular_perfil()
returns bsc_perfiles language plpgsql security definer set search_path = public as $$
declare
  fila bsc_perfiles;
  correo text := lower(auth.jwt() ->> 'email');
begin
  update bsc_perfiles set id = auth.uid(), actualizado = now()
    where email = correo and (id is null or id = auth.uid())
    returning * into fila;

  if fila.email is null then
    insert into bsc_perfiles (id, email, nombre, rol)
    values (auth.uid(), correo, correo, 'lector')
    on conflict (email) do update set id = excluded.id
    returning * into fila;
  end if;

  return fila;
end $$;
grant execute on function bsc_vincular_perfil() to authenticated;

alter table bsc_perfiles enable row level security;

drop policy if exists "perfiles_select" on bsc_perfiles;
create policy "perfiles_select" on bsc_perfiles for select to authenticated
  using (id = auth.uid() or bsc_es_admin());

drop policy if exists "perfiles_insert" on bsc_perfiles;
create policy "perfiles_insert" on bsc_perfiles for insert to authenticated
  with check (bsc_es_admin());

drop policy if exists "perfiles_update" on bsc_perfiles;
create policy "perfiles_update" on bsc_perfiles for update to authenticated
  using (bsc_es_admin()) with check (bsc_es_admin());

drop policy if exists "perfiles_delete" on bsc_perfiles;
create policy "perfiles_delete" on bsc_perfiles for delete to authenticated
  using (bsc_es_admin());

-- Configuración estratégica (perspectivas, objetivos, relaciones, indicadores,
-- responsables, empresa): todos los autenticados pueden VER, solo un
-- administrador puede escribir.
do $$
declare t text;
begin
  foreach t in array array['bsc_empresa','bsc_perspectivas','bsc_usuarios','bsc_objetivos',
                           'bsc_relaciones','bsc_indicadores']
  loop
    execute format('drop policy if exists "acceso_autenticado" on %I', t);
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format($f$create policy "%1$s_select" on %1$I for select to authenticated using (true)$f$, t);
    execute format('drop policy if exists "%1$s_write" on %1$s', t);
    execute format($f$create policy "%1$s_write" on %1$I for insert to authenticated with check (bsc_es_admin())$f$, t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format($f$create policy "%1$s_update" on %1$I for update to authenticated using (bsc_es_admin()) with check (bsc_es_admin())$f$, t);
    execute format('drop policy if exists "%1$s_delete" on %1$s', t);
    execute format($f$create policy "%1$s_delete" on %1$I for delete to authenticated using (bsc_es_admin())$f$, t);
  end loop;
end $$;

-- Mediciones (captura de datos): todos ven, pero solo se puede insertar/editar
-- si eres admin o si el indicador es tuyo como capturista. Borrar: solo admin.
drop policy if exists "acceso_autenticado" on bsc_mediciones;
drop policy if exists "mediciones_select" on bsc_mediciones;
create policy "mediciones_select" on bsc_mediciones for select to authenticated using (true);
drop policy if exists "mediciones_insert" on bsc_mediciones;
create policy "mediciones_insert" on bsc_mediciones for insert to authenticated
  with check (bsc_es_admin() or bsc_puede_capturar(indicador_id));
drop policy if exists "mediciones_update" on bsc_mediciones;
create policy "mediciones_update" on bsc_mediciones for update to authenticated
  using (bsc_es_admin() or bsc_puede_capturar(indicador_id))
  with check (bsc_es_admin() or bsc_puede_capturar(indicador_id));
drop policy if exists "mediciones_delete" on bsc_mediciones;
create policy "mediciones_delete" on bsc_mediciones for delete to authenticated using (bsc_es_admin());

-- ------------------------------------------------------------
-- 4. DATOS INICIALES (perspectivas de Kaplan & Norton)
--    Puedes omitir esta sección si vas a subir tus datos desde
--    la plataforma con el botón "⬆ Subir a la nube".
-- ------------------------------------------------------------
insert into bsc_empresa (id, nombre) values (1, 'Mi Empresa Automotriz')
  on conflict (id) do nothing;

insert into bsc_perspectivas (id, nombre, color, icono, orden, descripcion) values
  ('fin','Finanzas',                  '#0284c7','$',4,'¿Cómo nos ven los accionistas? Rentabilidad, flujo y estructura financiera.'),
  ('com','Comercial (Clientes)',      '#7c3aed','♥',3,'¿Cómo nos ven los clientes? Participación, satisfacción y crecimiento.'),
  ('pro','Procesos Internos',         '#ea580c','⚙',2,'¿En qué debemos ser excelentes? Cadena de importación, calidad y logística.'),
  ('apr','Aprendizaje y Crecimiento', '#059669','✦',1,'¿Podemos seguir mejorando? Capital humano, conocimiento y cultura.')
  on conflict (id) do nothing;

-- ============================================================
--  LISTO.
--  Crea las cuentas en Authentication → Users, pon tus claves en
--  el archivo .env y ejecuta  npm run dev.
--  La primera vez que inicies sesión, la plataforma siembra sola
--  los 35 indicadores, objetivos y relaciones causa-efecto.
-- ============================================================
