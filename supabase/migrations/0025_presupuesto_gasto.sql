-- ============================================================
-- Objetivos de gasto mensual (Ajustes -> Objetivos de gasto).
--
-- Una fila por usuario con la lista completa de lineas en jsonb:
--   [{ "id": "...", "grupo": "Vivienda", "nombre": "Luz", "importe": 30, "subcategoriaIds": [2] }, ...]
-- Sin fila = se usan los valores por defecto definidos en la app
-- (src/lib/finance/presupuestoGasto.ts). Con fila, manda la fila (aunque este vacia).
-- ============================================================

create table if not exists presupuesto_gasto (
  usuario_id  uuid primary key references profiles(id) on delete cascade,
  lineas      jsonb not null default '[]'::jsonb check (jsonb_typeof(lineas) = 'array'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table presupuesto_gasto enable row level security;

create policy presupuesto_gasto_select on presupuesto_gasto
  for select using (usuario_id = auth.uid());
create policy presupuesto_gasto_insert on presupuesto_gasto
  for insert with check (usuario_id = auth.uid());
create policy presupuesto_gasto_update on presupuesto_gasto
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy presupuesto_gasto_delete on presupuesto_gasto
  for delete using (usuario_id = auth.uid());

create trigger trg_presupuesto_gasto_updated_at
  before update on presupuesto_gasto
  for each row execute function set_updated_at();
