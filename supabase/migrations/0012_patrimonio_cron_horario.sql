-- ============================================================
-- Cambia el cron de precios de Patrimonio de 2 veces al dia (8:00/18:00 UTC, ver
-- 0011_patrimonio_cron_precios.sql) a una vez por hora, de 8:00 a 23:00 hora de España
-- (Europe/Madrid, con cambio de horario verano/invierno automatico).
--
-- Tambien anade una tabla de una sola fila con la hora del ultimo cron ejecutado, para poder
-- mostrarla de forma discreta al pie de la pagina de Patrimonio — la actualiza la propia Edge
-- Function (supabase/functions/actualizar-precios-patrimonio/index.ts) al terminar cada
-- ejecucion, via service_role (sin pasar por RLS); el cliente solo puede leerla.
--
-- IMPORTANTE — pasos manuales antes de ejecutar este archivo:
--
-- 1. La migracion 0011 ya se tiene que haber ejecutado (jobs "actualizar-precios-patrimonio-
--    manana"/"-tarde" y el secreto de Vault "service_role_key" ya configurados) — este archivo
--    solo reprograma el horario, no hace falta repetir el resto.
--
-- 2. Fijar la zona horaria de los cron jobs a España, para que "8:00-23:00" sea SIEMPRE hora
--    española real (y no se desplace con el cambio de horario). Ejecutar esta linea SOLA
--    primero:
--      alter database postgres set cron.timezone to 'Europe/Madrid';
--    Si da "permission denied to set parameter" (igual que con la service_role key en la
--    migracion 0011), tu entorno de Supabase no deja cambiar esto desde el SQL Editor — en ese
--    caso PARA AQUI y avisa antes de seguir: el resto de este archivo asume que el cron corre en
--    hora española; si se quedase en UTC por defecto, las 8:00-23:00 programadas mas abajo serian
--    en UTC (2 horas por delante de la hora española en verano, 1 en invierno).
--
-- 3. Ejecutar el resto de este archivo.
-- ============================================================

-- Desprograma los 2 jobs anteriores (8:00 y 18:00 fijos).
select cron.unschedule('actualizar-precios-patrimonio-manana');
select cron.unschedule('actualizar-precios-patrimonio-tarde');

-- Cada hora en punto, de 8:00 a 23:00 (16 ejecuciones/dia) en la zona horaria fijada en el paso 2.
select cron.schedule(
  'actualizar-precios-patrimonio-horario',
  '0 8-23 * * *',
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
