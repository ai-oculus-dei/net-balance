-- ============================================================
-- Patrimonio — venta de activos (con reparto FIFO entre lotes, ver
-- src/lib/finance/ventas.ts) y compra financiada desde una cuenta existente.
--
-- ventas_patrimonio registra cada venta (total o parcial): tipo/nombre/ticker/mercado son una
-- COPIA del activo en el momento de la venta, no una referencia viva — el lote origen puede
-- archivarse despues, o su nombre reutilizarse en otra posicion, sin que eso cambie el registro.
--
-- Los dos RPC de abajo (registrar_venta_patrimonio, crear_posicion_financiada_patrimonio) NO son
-- security definer: a diferencia de generar_snapshot_patrimonio, aqui no hace falta saltarse RLS
-- (cada tabla que tocan ya tiene policy de insert/update para `authenticated`) — la funcion solo
-- sirve para que varias escrituras relacionadas ocurran en una unica transaccion atomica. El
-- calculo (FIFO, cristalizacion de TAE al retirar) se hace en el cliente (src/lib/finance/ventas.ts,
-- testeado); estas funciones solo aplican el resultado ya calculado.
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado 0001-0015
-- (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

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
  -- Lote nuevo creado en la cuenta destino (si se abono el importe en alguna). Null si el dinero
  -- no se ha metido en ninguna cuenta trackeada.
  cuenta_destino_id      uuid references posiciones_patrimonio(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index idx_ventas_patrimonio_usuario on ventas_patrimonio (usuario_id);

alter table ventas_patrimonio enable row level security;

create policy ventas_patrimonio_select on ventas_patrimonio
  for select using (usuario_id = auth.uid());
create policy ventas_patrimonio_insert on ventas_patrimonio
  for insert with check (usuario_id = auth.uid());
create policy ventas_patrimonio_update on ventas_patrimonio
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy ventas_patrimonio_delete on ventas_patrimonio
  for delete using (usuario_id = auth.uid());

-- Aplica una venta ya calculada en el cliente (calcularVentaFIFO): reduce/archiva los lotes
-- indicados, inserta el registro de la venta, y si se paso cuenta destino, le abona el importe
-- recibido como un lote nuevo (igual que una aportacion manual a una cuenta existente).
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
