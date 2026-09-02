-- ============================================================
-- Cambia el cron de precios de Patrimonio de 2 veces al dia (8:00/18:00 UTC, ver
-- 0011_patrimonio_cron_precios.sql) a una vez por hora, cubriendo siempre las 8:00-23:00 hora de
-- España (con cambio de horario verano/invierno).
--
-- pg_cron programa en UTC y `cron.timezone` (que permitiria programar directamente en hora
-- española) es un parametro que solo se puede fijar al arrancar el servidor de Postgres — en un
-- Postgres gestionado por Supabase eso no esta al alcance del SQL Editor de ninguna forma
-- (error 55P02 al intentarlo). En vez de perseguir la hora exacta, se amplia la ventana en UTC
-- lo justo para que 8:00-23:00 España quede SIEMPRE dentro, sea cual sea la epoca del año:
--   - Invierno (CET, UTC+1): UTC 6-22 -> local 7:00-23:00 (cubre de sobra, 1h de mas a las 7).
--   - Verano   (CEST, UTC+2): UTC 6-22 -> local 8:00-00:00 (cubre de sobra, 1h de mas a medianoche).
-- Con las posiciones actuales, esas 1-2 horas de mas al dia no acercan nada al limite gratuito
-- de Twelve Data (800 peticiones/dia).
--
-- Tambien anade una tabla de una sola fila con la hora del ultimo cron ejecutado, para poder
-- mostrarla de forma discreta al pie de la pagina de Patrimonio — la actualiza la propia Edge
-- Function (supabase/functions/actualizar-precios-patrimonio/index.ts) al terminar cada
-- ejecucion, via service_role (sin pasar por RLS); el cliente solo puede leerla.
--
-- IMPORTANTE: la migracion 0011 ya se tiene que haber ejecutado (jobs "actualizar-precios-
-- patrimonio-manana"/"-tarde" y el secreto de Vault "service_role_key" ya configurados) — este
-- archivo solo reprograma el horario, no hace falta repetir el resto. Ejecutar directamente.
-- ============================================================

-- Desprograma los 2 jobs anteriores (8:00 y 18:00 fijos).
select cron.unschedule('actualizar-precios-patrimonio-manana');
select cron.unschedule('actualizar-precios-patrimonio-tarde');

-- Cada hora en punto, UTC 6:00-22:00 (17 ejecuciones/dia) — ver la explicacion arriba de por que
-- este rango en UTC cubre siempre las 8:00-23:00 de España.
select cron.schedule(
  'actualizar-precios-patrimonio-horario',
  '0 6-22 * * *',
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

create table patrimonio_precios_actualizacion (
  id             boolean primary key default true check (id), -- fuerza que solo pueda existir una fila
  actualizado_en timestamptz not null
);

alter table patrimonio_precios_actualizacion enable row level security;

-- Lectura para cualquier usuario autenticado (no es un dato de nadie en concreto, es el estado
-- del cron). Sin policies de insert/update: solo la Edge Function (service_role) la escribe.
create policy patrimonio_precios_actualizacion_select on patrimonio_precios_actualizacion
  for select using (true);

-- Para comprobar que el job quedo programado:
--   select jobid, jobname, schedule, active from cron.job;
-- Para ver el resultado de las ultimas ejecuciones:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- Para desprogramar (si algo falla y quieres pausarlo):
--   select cron.unschedule('actualizar-precios-patrimonio-horario');
