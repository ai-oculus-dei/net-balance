-- ============================================================
-- Precio de apertura diario por activo, para el P/L diario de Patrimonio (P/L de hoy respecto
-- al primer precio que se tiene del dia). Ver src/lib/finance/pnlDiario.ts.
--
-- La Edge Function actualizar-precios-patrimonio hace un upsert por activo y dia en cada
-- ejecucion (cada 15 min, ver 0023): la fila del dia se crea con el primer precio y despues se
-- sobrescribe precio_unitario. Con este trigger, precio_apertura se fija al crear la fila (el
-- primer precio del dia) y ninguna actualizacion posterior lo toca. No hace falta cambiar la
-- Edge Function.
--
-- Las filas que ya existian quedan con precio_apertura = null; la app usa entonces el ultimo
-- precio del dia anterior como apertura (asi el P/L diario funciona ya hoy).
-- ============================================================

alter table precios_historico_activo
  add column if not exists precio_apertura numeric(18,8);

create or replace function fijar_precio_apertura()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.precio_apertura := coalesce(new.precio_apertura, new.precio_unitario);
  else
    new.precio_apertura := old.precio_apertura;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_precio_apertura on precios_historico_activo;
create trigger trg_precio_apertura
  before insert or update on precios_historico_activo
  for each row execute function fijar_precio_apertura();
