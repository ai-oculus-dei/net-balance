-- ============================================================
-- Añade la columna es_inversion a subcategorias, hermana de es_ahorro: mismo tratamiento
-- de signo para la nueva metrica "Inversion total del mes" del Dashboard (seccion 9).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado
-- 0001-0005 (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

alter table subcategorias add column if not exists es_inversion boolean not null default false;

update subcategorias set es_inversion = true where nombre = 'Inversiones';
