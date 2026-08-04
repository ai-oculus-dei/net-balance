-- ============================================================
-- Sustituye el mecanismo de "cierre de mes" (nunca implementado) por aportaciones reales:
-- al registrar un gasto en la subcategoria "Ahorro", el usuario puede destinar (total o
-- parcialmente) su importe a un objetivo de ahorro concreto, sumando a su "acumulado".
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado
-- 0001-0004 (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

-- 1) Nuevas columnas en subcategorias
alter table subcategorias add column if not exists es_ahorro   boolean not null default false;
alter table subcategorias add column if not exists es_traspaso boolean not null default false;

update subcategorias set es_ahorro = true where nombre = 'Ahorro';
update subcategorias set es_traspaso = true where nombre in ('Ahorro', 'Inversiones');

-- 2) Redefinir aportaciones_objetivo (la version anterior nunca se llego a usar desde la app)
drop table if exists aportaciones_objetivo;

create table aportaciones_objetivo (
  id            uuid primary key default gen_random_uuid(),
  objetivo_id   uuid not null references objetivos_ahorro(id) on delete cascade,
  movimiento_id uuid references movimientos(id) on delete cascade,
  importe       numeric(12,2) not null check (importe > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (movimiento_id)
);

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

create trigger trg_aportaciones_updated_at before update on aportaciones_objetivo for each row execute function set_updated_at();

-- 3) RLS: cada usuario gestiona las aportaciones de sus propios objetivos
alter table aportaciones_objetivo enable row level security;

create policy aportaciones_select on aportaciones_objetivo
  for select using (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );

create policy aportaciones_insert on aportaciones_objetivo
  for insert with check (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );

create policy aportaciones_update on aportaciones_objetivo
  for update
  using (exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid()))
  with check (exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid()));

create policy aportaciones_delete on aportaciones_objetivo
  for delete using (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );
