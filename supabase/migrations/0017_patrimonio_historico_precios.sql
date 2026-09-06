-- ============================================================
-- Patrimonio — historico REAL de precio unitario por activo (no por posicion), para corregir el
-- backfill plano de patrimonio_historico (que usaba el precio de HOY para dias pasados, ver
-- TODO.md) y para una visualizacion nueva por activo (precio unitario / valor total en el
-- tiempo). Ver src/lib/finance/historicoPrecioActivo.ts.
--
-- Tambien añade un ledger de ventas por lote (ventas_patrimonio_lotes) + cantidad_original en
-- posiciones_patrimonio, para poder reconstruir cuantas unidades de una compra concreta seguian
-- en cartera un dia pasado, incluso si se vendio solo una parte de ella.
--
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado 0001-0016
-- (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

-- Precio unitario diario de cada activo (ticker+mercado normalizado igual que claveActivo:
-- trim + lowercase). Sin usuario_id: el precio de mercado no es un dato privado, se comparte
-- entre todos los usuarios que tengan el mismo activo. Solo lo escribe la Edge Function
-- actualizar-precios-patrimonio (service_role, sin pasar por RLS); el cliente solo lo lee.
create table precios_historico_activo (
  id              uuid primary key default gen_random_uuid(),
  ticker          text not null,
  mercado         text not null default '',
  fecha           date not null,
  precio_unitario numeric(18,8) not null,
  created_at      timestamptz not null default now(),
  unique (ticker, mercado, fecha)
);

create index idx_precios_historico_activo_clave on precios_historico_activo (ticker, mercado, fecha);

alter table precios_historico_activo enable row level security;

-- Igual que patrimonio_precios_actualizacion: no es un dato de un usuario en concreto, se puede
-- leer sin filtrar. Sin policies de insert/update/delete para `authenticated`.
create policy precios_historico_activo_select on precios_historico_activo
  for select using (true);

-- La cantidad realmente comprada de este lote, fija desde que se crea: una venta NUNCA la toca
-- (solo reduce `cantidad`). Sin esto, una vez archivado un lote totalmente vendido no habria
-- forma de saber cuanto se compro originalmente.
alter table posiciones_patrimonio add column cantidad_original numeric(18,8);
update posiciones_patrimonio set cantidad_original = cantidad where cantidad_original is null;
alter table posiciones_patrimonio alter column cantidad_original set not null;

-- Se fija sola a `cantidad` en el alta si no se manda explicitamente, para no tener que tocar
-- crearPosicionPatrimonio/crearPosicionFinanciada en el cliente.
create or replace function fijar_cantidad_original()
returns trigger
language plpgsql
as $$
begin
  if new.cantidad_original is null then
    new.cantidad_original := new.cantidad;
  end if;
  return new;
end;
$$;

create trigger trg_posiciones_patrimonio_cantidad_original
  before insert on posiciones_patrimonio
  for each row execute function fijar_cantidad_original();

-- Ledger: cuanto se ha consumido de CADA lote concreto en cada venta, y en que fecha. Es lo que
-- permite reconstruir "cuantas unidades de esta compra seguian en cartera el dia X" cuando solo
-- se ha vendido una parte de un lote (una venta total ya se resuelve solo con `activa=false`).
create table ventas_patrimonio_lotes (
  id                 uuid primary key default gen_random_uuid(),
  venta_id           uuid not null references ventas_patrimonio(id) on delete cascade,
  posicion_id        uuid not null references posiciones_patrimonio(id) on delete cascade,
  cantidad_consumida numeric(18,8) not null check (cantidad_consumida > 0),
  fecha              date not null,
  created_at         timestamptz not null default now()
);

create index idx_ventas_patrimonio_lotes_posicion on ventas_patrimonio_lotes (posicion_id);

alter table ventas_patrimonio_lotes enable row level security;

create policy ventas_patrimonio_lotes_select on ventas_patrimonio_lotes
  for select using (
    exists (select 1 from posiciones_patrimonio p where p.id = posicion_id and p.usuario_id = auth.uid())
  );
create policy ventas_patrimonio_lotes_insert on ventas_patrimonio_lotes
  for insert with check (
    exists (select 1 from posiciones_patrimonio p where p.id = posicion_id and p.usuario_id = auth.uid())
  );

-- generar_snapshot_patrimonio: deja de generar filas para posiciones CON ticker (su historico
-- real ya lo cubre precios_historico_activo + cantidad_original/ventas_patrimonio_lotes, ver
-- src/lib/finance/historicoPrecioActivo.ts) — sigue igual para cuentas/TAE/manual sin ticker.
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
    select * from posiciones_patrimonio where usuario_id = auth.uid() and activa = true and ticker is null
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

-- registrar_venta_patrimonio: se reordena para crear primero la fila de ventas_patrimonio (asi
-- se tiene su id) y el bucle de lotes ahora tambien inserta en ventas_patrimonio_lotes con la
-- cantidad_consumida de cada uno — p_lotes_actualizar gana ese campo junto a id/archivar/cantidad.
create or replace function registrar_venta_patrimonio(
  p_lotes_actualizar jsonb, -- [{"id": uuid, "archivar": bool, "cantidad": numeric|null, "cantidad_consumida": numeric}, ...]
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

grant execute on function registrar_venta_patrimonio(jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, uuid) to authenticated;
