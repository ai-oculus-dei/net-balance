-- ============================================================
-- Objetivos de cartera: etiqueta nucleo/satelite y % objetivo dentro del patrimonio.
--
-- Van a nivel de "unidad de cartera", no de compra (posicion) individual:
--   * 'bloque:liquidez'     -> cuentas corrientes, remuneradas, de ahorro, fondos monetarios y
--                              fondos indexados de renta fija, todos juntos
--   * 'bloque:indexados_rv' -> fondos indexados de renta variable, todos juntos
--   * 'activo:<clave>'      -> cualquier otro activo por separado (stock, ETF, cripto, commodity),
--                              con la misma clave que agrupa sus compras en la app (ticker|mercado)
-- Ver src/lib/finance/objetivosCartera.ts. Una fila por usuario y unidad; sin filas = sin objetivo.
-- ============================================================

create table if not exists objetivos_cartera (
  usuario_id    uuid not null references profiles(id) on delete cascade,
  clave         text not null,
  etiqueta      text check (etiqueta in ('nucleo', 'satelite')),
  objetivo_pct  numeric(5,2) check (objetivo_pct >= 0 and objetivo_pct <= 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (usuario_id, clave)
);

alter table objetivos_cartera enable row level security;

create policy objetivos_cartera_select on objetivos_cartera
  for select using (usuario_id = auth.uid());
create policy objetivos_cartera_insert on objetivos_cartera
  for insert with check (usuario_id = auth.uid());
create policy objetivos_cartera_update on objetivos_cartera
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy objetivos_cartera_delete on objetivos_cartera
  for delete using (usuario_id = auth.uid());

create trigger trg_objetivos_cartera_updated_at
  before update on objetivos_cartera
  for each row execute function set_updated_at();
