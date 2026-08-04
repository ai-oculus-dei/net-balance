-- ============================================================
-- Añade la subcategoria "Facturas" a "Vivienda" (seccion 5 de REQUIREMENTS.md)
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos que ya tenga
-- aplicado 0001_schema.sql (si se parte de cero, ya viene incluida en el seed).
-- ============================================================

insert into subcategorias (categoria_id, nombre)
select id, 'Facturas' from categorias where nombre = 'Vivienda'
on conflict (categoria_id, nombre) do nothing;
