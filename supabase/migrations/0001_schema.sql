-- ============================================================
-- Net Balance — esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o via `supabase db push`)
-- ============================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- PERFILES (vincula auth.users con "Alvaro" / "Lauri")
-- ============================================================
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Tras crear las 2 cuentas reales en Supabase Auth (Dashboard -> Authentication -> Users),
-- renombrar los perfiles generados automaticamente:
--   update profiles set nombre = 'Alvaro' where id = (select id from auth.users where email = 'amda.97@gmail.com');
--   update profiles set nombre = 'Lauri'  where id = (select id from auth.users where email = 'lauraplaza403@gmail.com');

-- ============================================================
-- TAXONOMIA (categorias / subcategorias — seccion 5 de REQUIREMENTS.md)
-- ============================================================
create table categorias (
  id     smallint generated always as identity primary key,
  nombre text not null unique
);

create table subcategorias (
  id              smallint generated always as identity primary key,
  categoria_id    smallint not null references categorias(id),
  nombre          text not null,
  -- true solo para: Salario, Paga Extra, Variable, Beneficios, Ingreso Extra (regla "ingreso real", seccion 5)
  es_ingreso_real boolean not null default false,
  unique (categoria_id, nombre)
);

insert into categorias (nombre) values
  ('Vivienda'), ('Transporte'), ('Alimentación'), ('Salud'),
  ('Deporte'), ('Ocio'), ('Compras'), ('Finanzas');

insert into subcategorias (categoria_id, nombre) values
  ((select id from categorias where nombre = 'Vivienda'), 'Alquiler'),
  ((select id from categorias where nombre = 'Vivienda'), 'Luz'),
  ((select id from categorias where nombre = 'Vivienda'), 'Agua'),
  ((select id from categorias where nombre = 'Vivienda'), 'Gas'),
  ((select id from categorias where nombre = 'Vivienda'), 'Internet'),
  ((select id from categorias where nombre = 'Vivienda'), 'Limpieza'),
  ((select id from categorias where nombre = 'Vivienda'), 'Línea Móvil'),
  ((select id from categorias where nombre = 'Vivienda'), 'Facturas'),

  ((select id from categorias where nombre = 'Transporte'), 'Letra Coche'),
  ((select id from categorias where nombre = 'Transporte'), 'Combustible'),
  ((select id from categorias where nombre = 'Transporte'), 'Mantenimiento'),
  ((select id from categorias where nombre = 'Transporte'), 'Seguro Coche'),
  ((select id from categorias where nombre = 'Transporte'), 'TTP'),
  ((select id from categorias where nombre = 'Transporte'), 'Taxi/Uber'),
  ((select id from categorias where nombre = 'Transporte'), 'Parking'),
  ((select id from categorias where nombre = 'Transporte'), 'Peaje'),

  ((select id from categorias where nombre = 'Alimentación'), 'Supermercado'),
  ((select id from categorias where nombre = 'Alimentación'), 'Expendedora'),
  ((select id from categorias where nombre = 'Alimentación'), 'Chino'),
  ((select id from categorias where nombre = 'Alimentación'), 'Comida a Domicilio'),
  ((select id from categorias where nombre = 'Alimentación'), 'Alcohol'),
  ((select id from categorias where nombre = 'Alimentación'), 'Refresco'),
  ((select id from categorias where nombre = 'Alimentación'), 'Café'),
  ((select id from categorias where nombre = 'Alimentación'), 'Restaurantes'),

  ((select id from categorias where nombre = 'Salud'), 'Seguro Médico'),
  ((select id from categorias where nombre = 'Salud'), 'Farmacia'),
  ((select id from categorias where nombre = 'Salud'), 'Peluquería'),
  ((select id from categorias where nombre = 'Salud'), 'Higiene'),
  ((select id from categorias where nombre = 'Salud'), 'Dentista'),
  ((select id from categorias where nombre = 'Salud'), 'Fisioterapia'),

  ((select id from categorias where nombre = 'Deporte'), 'Gimnasio'),
  ((select id from categorias where nombre = 'Deporte'), 'Running'),
  ((select id from categorias where nombre = 'Deporte'), 'Material Deportivo'),
  ((select id from categorias where nombre = 'Deporte'), 'Clases de Padel'),
  ((select id from categorias where nombre = 'Deporte'), 'Partido Padel'),
  ((select id from categorias where nombre = 'Deporte'), 'Crossfit'),

  ((select id from categorias where nombre = 'Ocio'), 'Viajes'),
  ((select id from categorias where nombre = 'Ocio'), 'Cines'),
  ((select id from categorias where nombre = 'Ocio'), 'Conciertos'),
  ((select id from categorias where nombre = 'Ocio'), 'Espectáculos'),
  ((select id from categorias where nombre = 'Ocio'), 'Actividades'),
  ((select id from categorias where nombre = 'Ocio'), 'Suscripciones'),
  ((select id from categorias where nombre = 'Ocio'), 'Videojuegos'),
  ((select id from categorias where nombre = 'Ocio'), 'Apuestas/Lotería'),
  ((select id from categorias where nombre = 'Ocio'), 'Libros'),
  ((select id from categorias where nombre = 'Ocio'), 'Discotecas'),

  ((select id from categorias where nombre = 'Compras'), 'Ropa'),
  ((select id from categorias where nombre = 'Compras'), 'Electrónica'),
  ((select id from categorias where nombre = 'Compras'), 'Muebles'),
  ((select id from categorias where nombre = 'Compras'), 'Decoración'),
  ((select id from categorias where nombre = 'Compras'), 'Regalos'),
  ((select id from categorias where nombre = 'Compras'), 'Juguetes'),

  ((select id from categorias where nombre = 'Finanzas'), 'Inversiones'),
  ((select id from categorias where nombre = 'Finanzas'), 'Efectivo'),
  ((select id from categorias where nombre = 'Finanzas'), 'Ahorro'),
  ((select id from categorias where nombre = 'Finanzas'), 'Impuestos');

insert into subcategorias (categoria_id, nombre, es_ingreso_real) values
  ((select id from categorias where nombre = 'Finanzas'), 'Salario', true),
  ((select id from categorias where nombre = 'Finanzas'), 'Paga Extra', true),
  ((select id from categorias where nombre = 'Finanzas'), 'Variable', true),
  ((select id from categorias where nombre = 'Finanzas'), 'Beneficios', true),
  ((select id from categorias where nombre = 'Finanzas'), 'Ingreso Extra', true);

-- ============================================================
-- GASTOS RECURRENTES (definicion unica, se replica cada mes — seccion 6)
-- `importe` admite signo: negativo = gasto fijo, positivo = ingreso recurrente (nomina, renta...)
-- ============================================================
create table gastos_recurrentes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(trim(nombre)) > 0),
  importe         numeric(12,2) not null check (importe <> 0),
  subcategoria_id smallint not null references subcategorias(id),
  dia_del_mes     smallint not null check (dia_del_mes between 1 and 31),
  usuario_id      uuid not null references profiles(id),
  visibilidad     text not null default 'privado' check (visibilidad in ('privado', 'compartido')),
  activo          boolean not null default true,
  fecha_inicio    date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- MOVIMIENTOS (seccion 3)
-- ============================================================
create table movimientos (
  id                   uuid primary key default gen_random_uuid(),
  fecha                timestamptz not null default now(),
  nombre               text not null check (char_length(trim(nombre)) > 0),
  importe              numeric(12,2) not null check (importe <> 0), -- signo = gasto (-) / ingreso (+)
  subcategoria_id      smallint not null references subcategorias(id),
  usuario_id           uuid not null references profiles(id),        -- a quien se atribuye el movimiento
  creado_por           uuid not null references profiles(id),        -- quien lo registro realmente
  visibilidad          text not null default 'privado' check (visibilidad in ('privado', 'compartido')),
  es_recurrente        boolean not null default false,
  gasto_recurrente_id  uuid references gastos_recurrentes(id) on delete set null,
  mes_generado         date, -- solo en movimientos autogenerados; evita duplicar el mismo mes
  nota                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uq_recurrente_mes unique (gasto_recurrente_id, mes_generado)
);

create index idx_movimientos_usuario_fecha on movimientos (usuario_id, fecha desc);
create index idx_movimientos_visibilidad   on movimientos (visibilidad);
create index idx_movimientos_subcategoria  on movimientos (subcategoria_id);

-- ============================================================
-- OBJETIVOS DE AHORRO (individuales — seccion 7)
-- ============================================================
create table objetivos_ahorro (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references profiles(id),
  nombre          text not null check (char_length(trim(nombre)) > 0),
  tipo            text not null check (tipo in ('acumulativo', 'recurrente')),
  meta            numeric(12,2),
  fecha_objetivo  date,
  modo_aportacion text not null check (modo_aportacion in ('automatico', 'manual')),
  porcentaje      numeric(5,2) check (porcentaje >= 0 and porcentaje <= 100),
  acumulado       numeric(12,2) not null default 0,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_acumulativo_meta    check (tipo <> 'acumulativo' or meta is not null),
  constraint chk_recurrente_sin_meta check (tipo <> 'recurrente' or (meta is null and fecha_objetivo is null)),
  constraint chk_manual_porcentaje   check (modo_aportacion <> 'manual' or porcentaje is not null),
  constraint chk_automatico_valido   check (modo_aportacion <> 'automatico' or (tipo = 'acumulativo' and fecha_objetivo is not null))
);

-- Log de aportaciones mensuales aplicadas (auditoria + fuente de "acumulado")
create table aportaciones_objetivo (
  id                uuid primary key default gen_random_uuid(),
  objetivo_id       uuid not null references objetivos_ahorro(id) on delete cascade,
  anio_mes          date not null, -- primer dia del mes
  importe_calculado numeric(12,2) not null, -- antes de la reduccion proporcional (seccion 8)
  importe_aplicado  numeric(12,2) not null, -- despues de la reduccion proporcional
  created_at        timestamptz not null default now(),
  unique (objetivo_id, anio_mes)
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_movimientos_updated_at        before update on movimientos        for each row execute function set_updated_at();
create trigger trg_gastos_recurrentes_updated_at before update on gastos_recurrentes for each row execute function set_updated_at();
create trigger trg_objetivos_updated_at          before update on objetivos_ahorro   for each row execute function set_updated_at();

-- ============================================================
-- Generacion mensual de movimientos recurrentes (seccion 6)
-- Invocada por RPC desde el cliente (no pg_cron, ver REQUIREMENTS/plan): idempotente
-- via uq_recurrente_mes, y resuelve gratis el caso de meses saltados sin abrir la app.
-- ============================================================
create or replace function generar_movimientos_recurrentes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  mes_cursor date;
  mes_actual date := date_trunc('month', current_date)::date;
  dia integer;
  fecha_generada date;
begin
  for r in
    select * from gastos_recurrentes
    where activo = true and usuario_id = auth.uid()
  loop
    mes_cursor := date_trunc('month', r.fecha_inicio)::date;
    while mes_cursor <= mes_actual loop
      dia := least(r.dia_del_mes, extract(day from (mes_cursor + interval '1 month - 1 day'))::int);
      fecha_generada := mes_cursor + (dia - 1);

      insert into movimientos (
        fecha, nombre, importe, subcategoria_id, usuario_id, creado_por,
        visibilidad, es_recurrente, gasto_recurrente_id, mes_generado
      )
      values (
        fecha_generada::timestamptz, r.nombre, r.importe, r.subcategoria_id, r.usuario_id, r.usuario_id,
        r.visibilidad, true, r.id, mes_cursor
      )
      on conflict (gasto_recurrente_id, mes_generado) do nothing;

      mes_cursor := mes_cursor + interval '1 month';
    end loop;
  end loop;
end;
$$;

grant execute on function generar_movimientos_recurrentes() to authenticated;
