-- ============================================================
-- Precios de Patrimonio cada 15 minutos (antes, cada hora: 0012_patrimonio_cron_horario.sql),
-- con la MISMA ventana horaria: UTC 6:00-22:00, que cubre siempre las 8:00-23:00 de España
-- (invierno: 7:00-23:00 local; verano: 8:00-00:00 local). Ver 0012 para el porque del rango UTC.
--
--   '*/15 6-21 * * *' -> 6:00, 6:15, ... 21:45 UTC (64 ejecuciones)
--   '0 22 * * *'      -> 22:00 UTC, la misma ultima ejecucion que tenia el cron horario
--   = 65 ejecuciones/dia (antes 17).
--
-- Consumo por ejecucion (ver supabase/functions/actualizar-precios-patrimonio/index.ts):
--   - Yahoo Finance: 1 peticion por ticker no cripto + 1 de EURUSD=X si hay alguno en USD.
--   - CoinGecko: 1 sola peticion para todas las criptos juntas.
--   - Edge Functions: 1 invocacion -> ~2.000/mes de las 500.000 del plan gratuito.
--
-- Requiere la Edge Function con CoinGecko agrupado ya desplegada (si no, cada cripto gasta una
-- llamada por ejecucion). La 0012 ya tiene que estar ejecutada (secreto service_role_key en Vault).
-- ============================================================

select cron.unschedule('actualizar-precios-patrimonio-horario');

select cron.schedule(
  'actualizar-precios-patrimonio-15min',
  '*/15 6-21 * * *',
  $$
  select net.http_post(
    url := 'https://koyvpbsnrxqheaugkxbu.supabase.co/functions/v1/actualizar-precios-patrimonio',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'actualizar-precios-patrimonio-cierre',
  '0 22 * * *',
  $$
  select net.http_post(
    url := 'https://koyvpbsnrxqheaugkxbu.supabase.co/functions/v1/actualizar-precios-patrimonio',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Comprobar:      select jobid, jobname, schedule, active from cron.job;
-- Ultimas ejecuciones: select * from cron.job_run_details order by start_time desc limit 10;
-- Volver al cron horario: desprogramar estos dos y volver a ejecutar el cron.schedule de la 0012.
