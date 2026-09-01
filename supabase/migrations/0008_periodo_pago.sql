-- ============================================================
-- Redefinicion de "mes" como periodo de nomina a nomina, en vez de mes de calendario.
-- Al registrar un ingreso de Salario, se puede marcar la casilla "Hacer primer dia del mes":
-- ese dia pasa a ser el inicio de un nuevo periodo personal (por usuario), que dura hasta el
-- dia antes del siguiente Salario marcado. Sin ninguna marca que defina un mes concreto (datos
-- historicos, o si se olvida marcar la casilla), ese mes sigue calculandose como mes de
-- calendario normal (ver src/lib/finance/periodos.ts).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga aplicado 0001-0007
-- (si se parte de cero, el esquema ya viene con esto incluido).
-- ============================================================

alter table movimientos add column if not exists es_primer_dia_mes boolean not null default false;
