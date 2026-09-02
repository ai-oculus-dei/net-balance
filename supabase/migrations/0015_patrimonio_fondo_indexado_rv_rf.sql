-- ============================================================
-- Divide el tipo "Fondo Indexado" en dos: "Fondo Indexado RV" (se queda en Renta Variable,
-- igual que antes) y "Fondo Indexado RF" (nuevo, va a Renta Fija) — ver TIPOS_POR_GRUPO en
-- src/lib/finance/patrimonio.ts.
--
-- OJO: entre las posiciones ya dadas de alta con tipo "fondo_indexado" puede haber tanto fondos
-- de renta variable (p.ej. "Vanguard Global Stock Index") como de renta fija (p.ej. "Vanguard
-- Global Bond Index") — un simple "todo pasa a RV" clasificaria mal el fondo de bonos. Este
-- script separa por nombre (busca "bond" en el nombre, sin distinguir mayusculas/minusculas).
-- Ejecutar la consulta de verificacion de mas abajo despues, y corregir a mano con un UPDATE
-- cualquier fondo que el filtro por nombre no haya detectado bien.
-- ============================================================

-- 1. Quita el check constraint viejo (nombre autogenerado por Postgres para un check inline).
alter table posiciones_patrimonio drop constraint posiciones_patrimonio_tipo_check;

-- 2. Los fondos de bonos pasan a Fondo Indexado RF...
update posiciones_patrimonio
set tipo = 'fondo_indexado_rf'
where tipo = 'fondo_indexado' and nombre ilike '%bond%';

-- ...el resto de "Fondo Indexado" pasa a Fondo Indexado RV.
update posiciones_patrimonio
set tipo = 'fondo_indexado_rv'
where tipo = 'fondo_indexado';

-- 3. Vuelve a poner el check, ya con los 2 tipos nuevos en vez del antiguo "fondo_indexado".
alter table posiciones_patrimonio add constraint posiciones_patrimonio_tipo_check check (tipo in (
  'stock', 'etf', 'fondo_indexado_rv', 'fondo_indexado_rf', 'fondo_monetario',
  'cuenta_remunerada', 'cuenta_ahorro', 'commodity', 'cuenta_corriente', 'criptomoneda'
));

-- Verificacion (ejecutar aparte, despues): revisa que cada fondo haya quedado en el tipo que
-- toca. Si alguno esta mal, corregirlo a mano:
--   select id, nombre, tipo from posiciones_patrimonio where tipo in ('fondo_indexado_rv', 'fondo_indexado_rf');
--   update posiciones_patrimonio set tipo = 'fondo_indexado_rf' where id = '<uuid de la posicion>';
