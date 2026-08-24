-- ============================================================
-- Nueva definicion de "Ingreso real" (seccion 5): ademas de Salario, Paga Extra, Variable,
-- Beneficios e Ingreso Extra (siempre), ahora tambien cuentan Impuestos, Ahorro, Efectivo e
-- Inversiones — pero SOLO en los meses en que su balance neto es positivo (una devolucion de
-- impuestos, o retirar de Ahorro/Inversiones/Efectivo mas de lo aportado ese mes).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado
-- 0001-0006 (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

alter table subcategorias add column if not exists es_ingreso_condicional boolean not null default false;

update subcategorias set es_ingreso_condicional = true where nombre in ('Impuestos', 'Ahorro', 'Efectivo', 'Inversiones');
