-- ============================================================
-- Patrimonio: seguimiento de posiciones de inversion/activos (Stock, ETFs, Fondo Indexado,
-- Fondo Monetario, Cuenta Remunerada, Cuenta de Ahorro, Commodity, Cuenta Corriente,
-- Criptomoneda), totalmente aparte del flujo de caja de "movimientos". Privado por usuario,
-- igual que objetivos_ahorro (nunca compartido entre los 2 usuarios).
--
-- El grupo de agrupacion (Renta Variable / Renta Fija / Efectivo) NO se guarda: se calcula en
-- el cliente a partir de `tipo` (ver src/lib/finance/patrimonio.ts).
--
-- El "Precio Actual" se actualiza a mano por ahora (sin integracion de mercado — ver REQUIREMENTS.md).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado 0001-0008
-- (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

create table posiciones_patrimonio (
  id                     uuid primary key default gen_random_uuid(),
  usuario_id             uuid not null references profiles(id),
  tipo                   text not null check (tipo in (
                           'stock', 'etf', 'fondo_indexado', 'fondo_monetario',
                           'cuenta_remunerada', 'cuenta_ahorro', 'commodity',
                           'cuenta_corriente', 'criptomoneda'
                         )),
  nombre                 text not null check (char_length(trim(nombre)) > 0),
  ticker                 text,
  mercado                text,
  -- cantidad = 1 para posiciones "de saldo" (cuentas, fondo monetario) sin concepto real de
  -- unidades: su precio_compra_unitario/precio_actual_unitario son directamente el valor total.
  cantidad               numeric(18,8) not null default 1 check (cantidad > 0),
  precio_compra_unitario numeric(18,8) not null check (precio_compra_unitario >= 0),
  precio_actual_unitario numeric(18,8) not null check (precio_actual_unitario >= 0),
  -- fecha real de adquisicion (puede ser anterior a created_at si se registra a posteriori):
  -- ancla desde donde el backfill del historico empieza a rellenar dias.
  fecha_compra           date not null default current_date,
  -- "borrar" una posicion la archiva en vez de eliminarla, para no destruir su historico
  -- (patrimonio_historico) — las posiciones archivadas se excluyen del snapshot diario y de
  -- los totales, pero su historico ya generado se conserva.
  activa                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index idx_posiciones_patrimonio_usuario on posiciones_patrimonio (usuario_id);
create index idx_posiciones_patrimonio_activa  on posiciones_patrimonio (usuario_id, activa);

create trigger trg_posiciones_patrimonio_updated_at
  before update on posiciones_patrimonio
  for each row execute function set_updated_at();

-- Snapshot diario del valor de cada posicion (una fila por dia como mucho, ver
-- generar_snapshot_patrimonio mas abajo) — fuente del historico por posicion y del historico
-- total del patrimonio (suma por fecha).
create table patrimonio_historico (
  id          uuid primary key default gen_random_uuid(),
  posicion_id uuid not null references posiciones_patrimonio(id) on delete cascade,
  fecha       date not null,
  valor_total numeric(18,2) not null,
  created_at  timestamptz not null default now(),
  unique (posicion_id, fecha)
);

create index idx_patrimonio_historico_posicion_fecha on patrimonio_historico (posicion_id, fecha);

alter table posiciones_patrimonio enable row level security;
alter table patrimonio_historico enable row level security;

create policy posiciones_patrimonio_select on posiciones_patrimonio
  for select using (usuario_id = auth.uid());
create policy posiciones_patrimonio_insert on posiciones_patrimonio
  for insert with check (usuario_id = auth.uid());
create policy posiciones_patrimonio_update on posiciones_patrimonio
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy posiciones_patrimonio_delete on posiciones_patrimonio
  for delete using (usuario_id = auth.uid());

create policy patrimonio_historico_select on patrimonio_historico
  for select using (
    exists (select 1 from posiciones_patrimonio p where p.id = posicion_id and p.usuario_id = auth.uid())
  );
-- Sin policies de insert/update/delete para `authenticated`: patrimonio_historico solo lo
-- escribe la funcion security definer de abajo, para que el cliente no pueda falsear el historico.

-- Genera el snapshot del dia (y rellena hacia atras cualquier dia saltado desde el ultimo
-- snapshot, o desde la creacion de la posicion si no tiene ninguno) para las posiciones del
-- usuario que llama. Idempotente via unique(posicion_id, fecha) + on conflict do nothing.
-- Cada dia rellenado hacia atras usa el precio_actual_unitario DE HOY (no se conoce el valor
-- real de dias intermedios sin abrir la app ese dia) — limitacion conocida, ver REQUIREMENTS.md.
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
begin
  for r in
    select * from posiciones_patrimonio where usuario_id = auth.uid() and activa = true
  loop
    select coalesce(max(fecha) + 1, r.fecha_compra) into fecha_cursor
    from patrimonio_historico where posicion_id = r.id;

    while fecha_cursor <= hoy loop
      insert into patrimonio_historico (posicion_id, fecha, valor_total)
      values (r.id, fecha_cursor, r.cantidad * r.precio_actual_unitario)
      on conflict (posicion_id, fecha) do nothing;
      fecha_cursor := fecha_cursor + 1;
    end loop;
  end loop;
end;
$$;

grant execute on function generar_snapshot_patrimonio() to authenticated;
