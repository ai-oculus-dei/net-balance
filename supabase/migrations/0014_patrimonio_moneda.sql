-- ============================================================
-- Anade moneda a posiciones_patrimonio: en que divisa da el precio el Ticker de Yahoo Finance
-- (EUR o USD). Con USD, la Edge Function actualizar-precios-patrimonio pide ademas el tipo de
-- cambio EUR/USD (ticker "EURUSD=X" de Yahoo) y lo aplica antes de guardar
-- precio_actual_unitario, que siempre queda en EUR.
--
-- No hace falta tocar RLS: es una columna nueva en una tabla que ya tiene sus policies.
-- ============================================================

alter table posiciones_patrimonio
  add column moneda text not null default 'EUR' check (moneda in ('EUR', 'USD'));
