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
  -- true en un ingreso de Salario marca ese dia como el inicio de un "mes" personal (periodo
  -- de nomina a nomina) para ese usuario_id, en vez del mes de calendario — ver 0008_periodo_pago.sql.
  es_primer_dia_mes    boolean not null default false,
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
-- PATRIMONIO (posiciones de inversion/activos, individuales — ver 0009_patrimonio.sql)
-- ============================================================
create table posiciones_patrimonio (
  id                     uuid primary key default gen_random_uuid(),
  usuario_id             uuid not null references profiles(id),
  tipo                   text not null check (tipo in (
                           'stock', 'etf', 'fondo_indexado_rv', 'fondo_indexado_rf',
                           'fondo_monetario', 'cuenta_remunerada', 'cuenta_ahorro',
                           'commodity', 'cuenta_corriente', 'criptomoneda'
                         )),
  nombre                 text not null check (char_length(trim(nombre)) > 0),
  ticker                 text,
  mercado                text,
  -- en que divisa da el precio el Ticker de Yahoo Finance: con USD, la Edge Function aplica el
  -- tipo de cambio EUR/USD antes de guardar precio_actual_unitario (que siempre queda en EUR).
  moneda                 text not null default 'EUR' check (moneda in ('EUR', 'USD')),
  cantidad               numeric(18,8) not null default 1 check (cantidad > 0),
  precio_compra_unitario numeric(18,8) not null check (precio_compra_unitario >= 0),
  -- precio_actual_unitario es opcional cuando hay una tae: en ese caso el valor actual se
  -- calcula solo (interes simple anualizado, ver generar_snapshot_patrimonio). Nunca los dos a
  -- la vez a null (chk_precio_actual_o_tae).
  precio_actual_unitario numeric(18,8) check (precio_actual_unitario >= 0),
  tae                    numeric(6,3) check (tae is null or tae >= 0),
  -- mensaje corto de la Edge Function actualizar-precios-patrimonio cuando no consigue
  -- actualizar el precio (ticker no encontrado, limite de peticiones...); null en cuanto vuelve
  -- a funcionar. El cliente lo usa para mostrar "-" en vez de un precio que podria estar viejo.
  error_precio           text,
  fecha_compra           date not null default current_date,
  activa                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint chk_precio_actual_o_tae check (tae is not null or precio_actual_unitario is not null)
);

create index idx_posiciones_patrimonio_usuario on posiciones_patrimonio (usuario_id);
create index idx_posiciones_patrimonio_activa  on posiciones_patrimonio (usuario_id, activa);

create table patrimonio_historico (
  id          uuid primary key default gen_random_uuid(),
  posicion_id uuid not null references posiciones_patrimonio(id) on delete cascade,
  fecha       date not null,
  valor_total numeric(18,2) not null,
  created_at  timestamptz not null default now(),
  unique (posicion_id, fecha)
);

create index idx_patrimonio_historico_posicion_fecha on patrimonio_historico (posicion_id, fecha);

-- Fila unica con la hora del ultimo cron de precios ejecutado (ver 0012_patrimonio_cron_horario.sql
-- y supabase/functions/actualizar-precios-patrimonio) — se muestra al pie de la pagina de
-- Patrimonio. La escribe solo la Edge Function (service_role); el cliente solo la lee.
create table patrimonio_precios_actualizacion (
  id             boolean primary key default true check (id),
  actualizado_en timestamptz not null
);

-- Genera (y rellena hacia atras, idempotente) el snapshot diario de las posiciones del usuario
-- que llama — ver comentario completo en 0009_patrimonio.sql.
create or replace function generar_snapshot_patrimonio()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  fecha_cursor date;
  hoy date := current_date;
  valor numeric(20,8);
begin
  for r in
    select * from posiciones_patrimonio where usuario_id = auth.uid() and activa = true
  loop
    select coalesce(max(fecha) + 1, r.fecha_compra) into fecha_cursor
    from patrimonio_historico where posicion_id = r.id;

    while fecha_cursor <= hoy loop
      if r.tae is not null then
        valor := r.cantidad * r.precio_compra_unitario
                 * (1 + (r.tae / 100) * ((fecha_cursor - r.fecha_compra)::numeric / 365));
      else
        valor := r.cantidad * r.precio_actual_unitario;
      end if;

      insert into patrimonio_historico (posicion_id, fecha, valor_total)
      values (r.id, fecha_cursor, valor)
      on conflict (posicion_id, fecha) do nothing;
      fecha_cursor := fecha_cursor + 1;
    end loop;
  end loop;
end;
$$;

grant execute on function generar_snapshot_patrimonio() to authenticated;

-- Registro de cada venta (total o parcial) de un activo, con reparto FIFO entre sus lotes — ver
-- src/lib/finance/ventas.ts y 0016_patrimonio_ventas.sql. tipo/nombre/ticker/mercado son una
-- COPIA del activo en el momento de la venta, no una referencia viva.
create table ventas_patrimonio (
  id                     uuid primary key default gen_random_uuid(),
  usuario_id             uuid not null references profiles(id),
  fecha                  date not null default current_date,
  tipo                   text not null,
  nombre                 text not null,
  ticker                 text,
  mercado                text,
  cantidad_vendida       numeric(18,8) not null check (cantidad_vendida > 0),
  precio_venta_unitario  numeric(18,8) not null check (precio_venta_unitario >= 0),
  importe_recibido       numeric(18,2) not null,
  coste_base_total       numeric(18,2) not null,
  ganancia_realizada     numeric(18,2) not null,
  -- lote nuevo creado en la cuenta destino (si se abono el importe en alguna); null si el dinero
  -- no se ha metido en ninguna cuenta trackeada.
  cuenta_destino_id      uuid references posiciones_patrimonio(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index idx_ventas_patrimonio_usuario on ventas_patrimonio (usuario_id);

-- Aplica una venta ya calculada en el cliente (calcularVentaFIFO): reduce/archiva los lotes
-- indicados, inserta el registro de la venta, y si se paso cuenta destino, le abona el importe
-- recibido como un lote nuevo (igual que una aportacion manual a una cuenta existente). No es
-- security definer: cada tabla que toca ya tiene policy de insert/update para `authenticated`,
-- esta funcion solo agrupa varias escrituras en una unica transaccion atomica.
create or replace function registrar_venta_patrimonio(
  p_lotes_actualizar jsonb, -- [{"id": uuid, "archivar": bool, "cantidad": numeric|null}, ...]
  p_tipo text, p_nombre text, p_ticker text, p_mercado text,
  p_cantidad_vendida numeric, p_precio_venta_unitario numeric,
  p_importe_recibido numeric, p_coste_base_total numeric, p_ganancia_realizada numeric,
  p_cuenta_destino_id uuid default null
) returns uuid
language plpgsql
as $$
declare
  r record;
  v_credito_id uuid;
  v_venta_id uuid;
begin
  for r in select * from jsonb_to_recordset(p_lotes_actualizar) as x(id uuid, archivar boolean, cantidad numeric)
  loop
    if r.archivar then
      update posiciones_patrimonio set activa = false where id = r.id and usuario_id = auth.uid();
    else
      update posiciones_patrimonio set cantidad = r.cantidad where id = r.id and usuario_id = auth.uid();
    end if;
  end loop;

  if p_cuenta_destino_id is not null then
    insert into posiciones_patrimonio (usuario_id, tipo, nombre, cantidad, precio_compra_unitario, precio_actual_unitario, fecha_compra)
    select auth.uid(), tipo, nombre, 1, p_importe_recibido, p_importe_recibido, current_date
    from posiciones_patrimonio where id = p_cuenta_destino_id and usuario_id = auth.uid()
    returning id into v_credito_id;
  end if;

  insert into ventas_patrimonio (
    usuario_id, tipo, nombre, ticker, mercado, cantidad_vendida, precio_venta_unitario,
    importe_recibido, coste_base_total, ganancia_realizada, cuenta_destino_id
  ) values (
    auth.uid(), p_tipo, p_nombre, p_ticker, p_mercado, p_cantidad_vendida, p_precio_venta_unitario,
    p_importe_recibido, p_coste_base_total, p_ganancia_realizada, v_credito_id
  ) returning id into v_venta_id;

  return v_venta_id;
end;
$$;

grant execute on function registrar_venta_patrimonio(jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, uuid) to authenticated;

-- Crea una posicion nueva y, si se indica cuenta origen, aplica en la misma transaccion el
-- resultado ya calculado en el cliente por retirarDeCuenta (archivar, o los campos a cambiar:
-- cristalizacion de TAE si aplica, o simple bajada del saldo actual si no).
create or replace function crear_posicion_financiada_patrimonio(
  p_tipo text, p_nombre text, p_ticker text, p_mercado text, p_moneda text,
  p_cantidad numeric, p_precio_compra_unitario numeric, p_precio_actual_unitario numeric,
  p_tae numeric, p_fecha_compra date,
  p_cuenta_origen_id uuid, p_origen_archivar boolean,
  p_origen_precio_compra_unitario numeric default null,
  p_origen_fecha_compra date default null,
  p_origen_precio_actual_unitario numeric default null,
  p_origen_tae numeric default null
) returns uuid
language plpgsql
as $$
declare
  v_nueva_id uuid;
begin
  insert into posiciones_patrimonio (
    usuario_id, tipo, nombre, ticker, mercado, moneda, cantidad,
    precio_compra_unitario, precio_actual_unitario, tae, fecha_compra
  ) values (
    auth.uid(), p_tipo, p_nombre, p_ticker, p_mercado, p_moneda, p_cantidad,
    p_precio_compra_unitario, p_precio_actual_unitario, p_tae, p_fecha_compra
  ) returning id into v_nueva_id;

  if p_cuenta_origen_id is not null then
    if p_origen_archivar then
      update posiciones_patrimonio set activa = false where id = p_cuenta_origen_id and usuario_id = auth.uid();
    else
      update posiciones_patrimonio set
        precio_compra_unitario = coalesce(p_origen_precio_compra_unitario, precio_compra_unitario),
        fecha_compra = coalesce(p_origen_fecha_compra, fecha_compra),
        precio_actual_unitario = p_origen_precio_actual_unitario,
        tae = p_origen_tae
      where id = p_cuenta_origen_id and usuario_id = auth.uid();
    end if;
  end if;

  return v_nueva_id;
end;
$$;

grant execute on function crear_posicion_financiada_patrimonio(text, text, text, text, text, numeric, numeric, numeric, numeric, date, uuid, boolean, numeric, date, numeric, numeric) to authenticated;

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
create trigger trg_posiciones_patrimonio_updated_at before update on posiciones_patrimonio for each row execute function set_updated_at();
