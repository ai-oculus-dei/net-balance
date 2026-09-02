-- ============================================================
-- Anade error_precio a posiciones_patrimonio: la Edge Function actualizar-precios-patrimonio
-- guarda ahi un mensaje corto cuando no consigue actualizar el precio de una posicion (ticker
-- no encontrado, limite de peticiones, simbolo no cubierto...), y lo deja a null en cuanto una
-- actualizacion vuelve a funcionar. El cliente lo usa para mostrar "-" en vez de un numero que
-- podria estar desactualizado, sin tener que ir a mirar los logs de la funcion.
--
-- No hace falta tocar RLS: es una columna nueva en una tabla que ya tiene sus policies (RLS no
-- distingue por columna).
-- ============================================================

alter table posiciones_patrimonio add column error_precio text;
