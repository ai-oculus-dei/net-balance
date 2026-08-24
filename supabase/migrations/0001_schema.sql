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
  -- true para las subcategorias fijas de la seccion 6: el "disponible" (seccion 8) resta el
  -- balance neto (gasto - ingreso) de estas subcategorias como "gastos fijos" cada mes.
  es_gasto_fijo   boolean not null default false,
  -- true solo para "Ahorro": un gasto en esta subcategoria puede destinarse (total o
  -- parcialmente) a un objetivo de ahorro concreto (seccion 7), sumando a su "acumulado".
  es_ahorro       boolean not null default false,
  -- true solo para "Inversiones": mismo tratamiento de signo que es_ahorro para la metrica
  -- "Inversion total del mes" (negativo = se invirtio de verdad; positivo = retirada).
  es_inversion    boolean not null default false,
  -- true para "Ahorro" e "Inversiones": son traspasos a otra cuenta propia, no gasto real.
  -- Se usa para el aviso informativo del alta de movimiento y para excluirlos del "gasto
  -- total real" en las metricas del Dashboard (seccion 9).
  es_traspaso     boolean not null default false,
  -- true solo para: Impuestos, Ahorro, Efectivo, Inversiones. Su balance neto del mes solo
  -- cuenta como ingreso real (seccion 5) cuando es POSITIVO (p.ej. una devolucion de
  -- impuestos, o retirar mas de Ahorro/Inversiones de lo aportado ese mes) — si es negativo
  -- no resta del ingreso real, simplemente no suma nada.
  es_ingreso_condicional boolean not null default false,
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

-- Subcategorias cuyo balance neto mensual cuenta como "gastos fijos" (seccion 6/8)
update subcategorias set es_gasto_fijo = true where nombre in (
  'Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Limpieza', 'Línea Móvil', 'Facturas',
  'Letra Coche', 'Combustible', 'Seguro Coche',
  'Supermercado',
  'Seguro Médico',
  'Crossfit', 'Gimnasio', 'Clases de Padel',
  'Suscripciones',
  'Electrónica'
);

-- "Ahorro" permite destinar el gasto a un objetivo; "Ahorro" e "Inversiones" son traspasos
update subcategorias set es_ahorro = true where nombre = 'Ahorro';
update subcategorias set es_inversion = true where nombre = 'Inversiones';
update subcategorias set es_traspaso = true where nombre in ('Ahorro', 'Inversiones');
update subcategorias set es_ingreso_condicional = true where nombre in ('Impuestos', 'Ahorro', 'Efectivo', 'Inversiones');

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
  nota                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
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

-- Aportaciones reales a un objetivo, originadas al registrar un gasto en la subcategoria
-- "Ahorro" (es_ahorro = true) y elegir a que objetivo se destina (seccion 7). Es la fuente
-- unica de verdad de "acumulado": un trigger (mas abajo) lo mantiene sincronizado.
create table aportaciones_objetivo (
  id            uuid primary key default gen_random_uuid(),
  objetivo_id   uuid not null references objetivos_ahorro(id) on delete cascade,
  movimiento_id uuid references movimientos(id) on delete cascade,
  importe       numeric(12,2) not null check (importe > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (movimiento_id)
);

-- Mantiene objetivos_ahorro.acumulado sincronizado con la suma de sus aportaciones,
-- para que crear/editar/borrar una aportacion (o borrar el movimiento que la origino,
-- via cascade) mueva la barra de progreso automaticamente.
create or replace function aplicar_aportacion_objetivo()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update objetivos_ahorro set acumulado = acumulado + new.importe where id = new.objetivo_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update objetivos_ahorro set acumulado = acumulado - old.importe where id = old.objetivo_id;
    return old;
  elsif TG_OP = 'UPDATE' then
    if old.objetivo_id = new.objetivo_id then
      update objetivos_ahorro set acumulado = acumulado - old.importe + new.importe where id = new.objetivo_id;
    else
      update objetivos_ahorro set acumulado = acumulado - old.importe where id = old.objetivo_id;
      update objetivos_ahorro set acumulado = acumulado + new.importe where id = new.objetivo_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_aportacion_objetivo_insert after insert on aportaciones_objetivo for each row execute function aplicar_aportacion_objetivo();
create trigger trg_aportacion_objetivo_update after update on aportaciones_objetivo for each row execute function aplicar_aportacion_objetivo();
create trigger trg_aportacion_objetivo_delete after delete on aportaciones_objetivo for each row execute function aplicar_aportacion_objetivo();

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

create trigger trg_movimientos_updated_at   before update on movimientos          for each row execute function set_updated_at();
create trigger trg_objetivos_updated_at     before update on objetivos_ahorro     for each row execute function set_updated_at();
create trigger trg_aportaciones_updated_at  before update on aportaciones_objetivo for each row execute function set_updated_at();
