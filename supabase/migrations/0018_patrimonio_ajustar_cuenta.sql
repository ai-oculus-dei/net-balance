-- ============================================================
-- Patrimonio — ajustar el saldo de una cuenta "de saldo" (Cuenta Corriente, Cuenta Remunerada,
-- Cuenta de Ahorro, Fondo Monetario) ya existente: en vez de dar de alta una posicion nueva que
-- se agrupa visualmente con la existente (como se hacia hasta ahora), añadir o restar un importe
-- hace crecer/reducir la MISMA posicion, y deja constancia inmediata del cambio en
-- patrimonio_historico para el dia exacto (sin esperar al snapshot diario, que si ya se habia
-- generado hoy antes de este ajuste se habria quedado con el valor viejo — ver TODO.md).
--
-- El calculo (valor efectivo a hoy — con formula de TAE si la posicion todavia tenia una fijada
-- de antes, cristalizandola — mas/menos el importe) se hace en el cliente
-- (ajustarCuenta en src/lib/finance/ventas.ts, mismo patron que retirarDeCuenta); esta funcion
-- solo aplica el resultado ya calculado. Es security definer porque patrimonio_historico no
-- tiene policy de insert/update para `authenticated` (para que el cliente no pueda falsear el
-- historico libremente) — aun asi, cada escritura comprueba explicitamente la propiedad via
-- usuario_id = auth.uid(), igual que el resto de RPC de este proyecto.
create or replace function ajustar_cuenta_patrimonio(
  p_posicion_id uuid,
  p_precio_compra_unitario numeric,
  p_precio_actual_unitario numeric,
  p_fecha date
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update posiciones_patrimonio
  set precio_compra_unitario = p_precio_compra_unitario,
      precio_actual_unitario = p_precio_actual_unitario,
      tae = null
  where id = p_posicion_id and usuario_id = auth.uid();

  insert into patrimonio_historico (posicion_id, fecha, valor_total)
  select p_posicion_id, p_fecha, p.cantidad * p_precio_actual_unitario
  from posiciones_patrimonio p
  where p.id = p_posicion_id and p.usuario_id = auth.uid()
  on conflict (posicion_id, fecha) do update set valor_total = excluded.valor_total;
end;
$$;

grant execute on function ajustar_cuenta_patrimonio(uuid, numeric, numeric, date) to authenticated;
