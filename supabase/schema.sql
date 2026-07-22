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
                           'bsc_relaciones','bsc_indicadores','bsc_mediciones']
  loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s', t);
    execute format('create trigger trg_touch_%1$s before update on %1$s
                    for each row execute function bsc_touch()', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. SEGURIDAD (RLS): solo usuarios autenticados
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
