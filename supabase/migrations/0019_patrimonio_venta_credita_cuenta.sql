-- ============================================================
-- Patrimonio — al vender un activo y abonar el importe recibido en una cuenta existente, esa
-- cuenta ahora CRECE directamente (igual que ajustar_cuenta_patrimonio) en vez de crear una
-- posicion nueva agrupada visualmente con ella — Cuenta Corriente/Remunerada/Ahorro/Fondo
-- Monetario son siempre una unica posicion (ver 0018_patrimonio_ajustar_cuenta.sql).
--
-- El calculo (valor efectivo a hoy — cristalizando TAE si aplica — mas el importe recibido) se
-- hace en el cliente (ajustarCuenta en src/lib/finance/ventas.ts, ya usado por
-- ajustar_cuenta_patrimonio); esta funcion solo aplica el resultado ya calculado, y corrige
-- patrimonio_historico de la cuenta destino para hoy en la misma transaccion.
-- ============================================================

-- La version anterior tenia 11 parametros (sin los 2 nuevos de la cuenta destino al final):
-- create or replace no sustituye una funcion si la lista de parametros cambia, crea otra
-- sobrecargada — hay que borrar la firma vieja explicitamente para no dejarla huerfana.
drop function if exists registrar_venta_patrimonio(jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, uuid);

create or replace function registrar_venta_patrimonio(
  p_lotes_actualizar jsonb, -- [{"id": uuid, "archivar": bool, "cantidad": numeric|null, "cantidad_consumida": numeric}, ...]
  p_tipo text, p_nombre text, p_ticker text, p_mercado text,
  p_cantidad_vendida numeric, p_precio_venta_unitario numeric,
  p_importe_recibido numeric, p_coste_base_total numeric, p_ganancia_realizada numeric,
  p_cuenta_destino_id uuid default null,
  p_destino_precio_compra_unitario numeric default null,
  p_destino_precio_actual_unitario numeric default null
) returns uuid
language plpgsql
as $$
declare
  r record;
  v_venta_id uuid;
begin
  if p_cuenta_destino_id is not null then
    update posiciones_patrimonio
    set precio_compra_unitario = p_destino_precio_compra_unitario,
        precio_actual_unitario = p_destino_precio_actual_unitario,
        tae = null
    where id = p_cuenta_destino_id and usuario_id = auth.uid();

    insert into patrimonio_historico (posicion_id, fecha, valor_total)
    select p_cuenta_destino_id, current_date, p.cantidad * p_destino_precio_actual_unitario
    from posiciones_patrimonio p
    where p.id = p_cuenta_destino_id and p.usuario_id = auth.uid()
    on conflict (posicion_id, fecha) do update set valor_total = excluded.valor_total;
  end if;

  insert into ventas_patrimonio (
    usuario_id, tipo, nombre, ticker, mercado, cantidad_vendida, precio_venta_unitario,
    importe_recibido, coste_base_total, ganancia_realizada, cuenta_destino_id
  ) values (
    auth.uid(), p_tipo, p_nombre, p_ticker, p_mercado, p_cantidad_vendida, p_precio_venta_unitario,
    p_importe_recibido, p_coste_base_total, p_ganancia_realizada, p_cuenta_destino_id
  ) returning id into v_venta_id;

  for r in select * from jsonb_to_recordset(p_lotes_actualizar) as x(id uuid, archivar boolean, cantidad numeric, cantidad_consumida numeric)
  loop
    if r.archivar then
      update posiciones_patrimonio set activa = false where id = r.id and usuario_id = auth.uid();
    else
      update posiciones_patrimonio set cantidad = r.cantidad where id = r.id and usuario_id = auth.uid();
    end if;

    insert into ventas_patrimonio_lotes (venta_id, posicion_id, cantidad_consumida, fecha)
    select v_venta_id, r.id, r.cantidad_consumida, current_date
    where exists (select 1 from posiciones_patrimonio p where p.id = r.id and p.usuario_id = auth.uid());
  end loop;

  return v_venta_id;
end;
$$;

grant execute on function registrar_venta_patrimonio(jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, uuid, numeric, numeric) to authenticated;
