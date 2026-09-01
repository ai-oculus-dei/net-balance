-- ============================================================
-- Patrimonio — rentabilidad conocida (TAE) para posiciones "de saldo" con interes (Fondo
-- Monetario, Cuenta Remunerada, Cuenta de Ahorro): en vez de actualizar el "Precio Actual" a
-- mano, se puede fijar una TAE una sola vez y el valor actual se calcula solo por formula de
-- interes simple anualizado, sin depender de ninguna fuente externa:
--
--   valor_actual = precio_compra_unitario * (1 + (tae/100) * dias_transcurridos / 365)
--
-- Con esto, precio_actual_unitario deja de ser obligatorio: una posicion tiene SIEMPRE uno de
-- los dos (tae, o precio_actual_unitario a mano), nunca ninguno de los dos a la vez que null.
-- Ver src/lib/finance/patrimonio.ts para el mismo calculo en el cliente (vista en vivo) y la
-- funcion generar_snapshot_patrimonio de abajo para el historico diario.
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado 0001-0009
-- (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

alter table posiciones_patrimonio alter column precio_actual_unitario drop not null;

alter table posiciones_patrimonio add column if not exists tae numeric(6,3) check (tae is null or tae >= 0);

alter table posiciones_patrimonio add constraint chk_precio_actual_o_tae
  check (tae is not null or precio_actual_unitario is not null);

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
