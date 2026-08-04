-- ============================================================
-- Elimina la funcionalidad de gastos recurrentes y la sustituye por una
-- definicion fija de "gastos fijos" basada en subcategoria (seccion 6/8).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya
-- tenga aplicado 0001_schema.sql/0002_rls.sql (si se parte de cero, el
-- esquema ya viene sin recurrentes y con `es_gasto_fijo` incluido).
-- ============================================================

-- 1) Quitar todo lo relacionado con gastos_recurrentes
drop function if exists generar_movimientos_recurrentes();

alter table movimientos drop constraint if exists uq_recurrente_mes;
alter table movimientos drop column if exists gasto_recurrente_id;
alter table movimientos drop column if exists mes_generado;
alter table movimientos drop column if exists es_recurrente;

drop table if exists gastos_recurrentes;

-- 2) Nueva definicion de "gastos fijos": columna en subcategorias + seed
alter table subcategorias add column if not exists es_gasto_fijo boolean not null default false;

update subcategorias set es_gasto_fijo = true where nombre in (
  'Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Limpieza', 'Línea Móvil', 'Facturas',
  'Letra Coche', 'Combustible', 'Seguro Coche',
  'Supermercado',
  'Seguro Médico',
  'Crossfit', 'Gimnasio', 'Clases de Padel',
  'Suscripciones',
  'Electrónica'
);
