-- ============================================================
-- Programa la Edge Function "actualizar-precios-patrimonio" para que se ejecute sola dos veces
-- al dia (8:00 y 18:00 UTC), actualizando precio_actual_unitario de las posiciones con ticker
-- que no usan tae, consultando Twelve Data / CoinGecko en vivo — ver
-- supabase/functions/actualizar-precios-patrimonio/index.ts.
--
-- La service_role key que necesita el cron para poder llamar a la funcion se guarda con Vault
-- (extension de Supabase pensada exactamente para esto: secretos usados dentro de la base de
-- datos, cifrados en reposo). NO se usa "alter database ... set" porque el SQL Editor no tiene
-- permiso para cambiar parametros de la base de datos en el entorno gestionado de Supabase.
--
-- IMPORTANTE — pasos manuales antes de ejecutar este archivo:
--
-- 1. Funcion ya desplegada y clave de Twelve Data ya configurada (paso hecho via CLI).
--
-- 2. Project ref ya sustituido en la URL de mas abajo (koyvpbsnrxqheaugkxbu).
--
-- 3. Guardar la service_role key en Vault (Supabase Dashboard -> Settings -> API -> API Keys ->
--    la que empieza por `sb_secret_` — NO el JWT largo `eyJ...` de "service_role" clasico, son
--    claves distintas y SUPABASE_SERVICE_ROLE_KEY (la que la funcion recibe inyectada) resuelve
--    a la `sb_secret_...` en proyectos con el sistema nuevo de claves; si se guarda el JWT por
--    error la funcion responde 401 aunque el cron mande "algo" en el Authorization. NUNCA subas
--    esta clave al repo. Ejecutar esta linea aparte, sustituyendo el valor real, ANTES de las
--    lineas de cron.schedule:
--      select vault.create_secret('<TU_SB_SECRET_KEY>', 'service_role_key');
--
--    (Si ya la habias guardado antes con este mismo nombre y quieres cambiar el valor, usa en su
--    lugar: select vault.update_secret((select id from vault.secrets where name =
--    'service_role_key'), '<TU_SERVICE_ROLE_KEY>');)
--
-- 4. Ejecutar el resto de este archivo.
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'actualizar-precios-patrimonio-manana',
  '0 8 * * *',
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
  'actualizar-precios-patrimonio-tarde',
  '0 18 * * *',
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

-- Para comprobar que los dos jobs quedaron programados:
--   select jobid, jobname, schedule, active from cron.job;
-- Para ver el resultado de las ultimas ejecuciones:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- Para desprogramar (si algo falla y quieres pausarlo):
--   select cron.unschedule('actualizar-precios-patrimonio-manana');
--   select cron.unschedule('actualizar-precios-patrimonio-tarde');
