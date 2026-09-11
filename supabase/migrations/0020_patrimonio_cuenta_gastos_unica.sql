-- ============================================================
-- Evita que useSincronizarCuentaGastos pueda crear mas de una Cuenta Corriente "Gastos" activa
-- por usuario: si dos pestañas/dispositivos ven "no existe todavia" casi a la vez, cada uno podia
-- crear la suya (visto en produccion, 2026-09-11 — dos filas "Gastos" para el mismo usuario,
-- sumando su valor por duplicado en Patrimonio). El segundo intento ahora falla por el indice
-- unico; el hook lo trata como "ya la ha creado otra ejecucion" y no hace nada mas ese intento.
-- ============================================================

create unique index if not exists idx_posiciones_patrimonio_unica_cuenta_gastos
on posiciones_patrimonio (usuario_id)
where activa and tipo = 'cuenta_corriente' and lower(trim(nombre)) = 'gastos';
