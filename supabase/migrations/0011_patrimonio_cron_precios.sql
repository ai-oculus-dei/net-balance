-- ============================================================
-- Programa la Edge Function "actualizar-precios-patrimonio" para que se ejecute sola dos veces
-- al dia (8:00 y 18:00 UTC), actualizando precio_actual_unitario de las posiciones con ticker
-- que no usan tae, consultando Twelve Data / CoinGecko en vivo — ver
-- supabase/functions/actualizar-precios-patrimonio/index.ts.
--
-- IMPORTANTE — pasos manuales antes de ejecutar este archivo:
--
-- 1. Desplegar la funcion (una vez, desde tu terminal en la raiz del repo):
--      npx supabase link --project-ref <TU_PROJECT_REF>
--      npx supabase functions deploy actualizar-precios-patrimonio
--      npx supabase secrets set TWELVE_DATA_API_KEY=<tu_clave_de_twelvedata>
--
-- 2. Sustituir <PROJECT_REF> por el project ref real en la URL de mas abajo (Supabase Dashboard
--    -> Settings -> General -> Reference ID).
--
-- 3. Guardar la service_role key como ajuste de la base de datos (Supabase Dashboard ->
--    Settings -> API -> Project API keys -> service_role — NUNCA la subas al repo). Ejecutar
--    esta linea aparte, sustituyendo el valor real, ANTES de las lineas de cron.schedule:
--      alter database postgres set app.settings.service_role_key = '<TU_SERVICE_ROLE_KEY>';
--
-- 4. Recargar la configuracion de la sesion (o simplemente abrir una query nueva) y entonces
--    ejecutar el resto de este archivo.
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'actualizar-precios-patrimonio-manana',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/actualizar-precios-patrimonio',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'actualizar-precios-patrimonio-tarde',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/actualizar-precios-patrimonio',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para comprobar que los dos jobs quedaron programados:
--   select jobid, jobname, schedule, active from cron.job;
-- Para ver el resultado de las ultimas ejecuciones:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- Para desprogramar (si algo falla y quieres pausarlo):
--   select cron.unschedule('actualizar-precios-patrimonio-manana');
--   select cron.unschedule('actualizar-precios-patrimonio-tarde');
