-- ============================================================
-- Net Balance — Row Level Security
-- Ejecutar despues de 0001_schema.sql
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy profiles_select_all on profiles
  for select using (auth.uid() is not null); -- ambos necesitan ver el nombre del otro en movimientos compartidos

create policy profiles_update_self on profiles
  for update using (auth.uid() = id);
-- Sin policy de insert/delete: solo el trigger handle_new_user (security definer) crea perfiles.

-- ============================================================
-- categorias / subcategorias (solo lectura para el cliente)
-- ============================================================
alter table categorias enable row level security;
create policy categorias_select on categorias for select using (auth.uid() is not null);

alter table subcategorias enable row level security;
create policy subcategorias_select on subcategorias for select using (auth.uid() is not null);
-- Sin policies de insert/update/delete: la taxonomia solo cambia por migracion SQL (seccion 13).

-- ============================================================
-- movimientos
-- ============================================================
alter table movimientos enable row level security;

-- Ver: siempre los propios (por usuario_id); los del otro SOLO si visibilidad = compartido
create policy movimientos_select on movimientos
  for select using (
    usuario_id = auth.uid()
    or visibilidad = 'compartido'
  );

-- Insertar: cualquiera de los 2 usuarios puede crear un movimiento para si mismo
-- o "a nombre" del otro (usuario_id != auth.uid()), pero siempre queda registrado
-- quien lo creo realmente (seccion 4).
create policy movimientos_insert on movimientos
  for insert with check (creado_por = auth.uid());

-- Editar/borrar: quien es el dueño del movimiento (usuario_id) o quien lo creo
create policy movimientos_update on movimientos
  for update
  using (usuario_id = auth.uid() or creado_por = auth.uid())
  with check (usuario_id = auth.uid() or creado_por = auth.uid());

create policy movimientos_delete on movimientos
  for delete using (usuario_id = auth.uid() or creado_por = auth.uid());

-- ============================================================
-- objetivos_ahorro (individuales — nunca compartidos, seccion 7)
-- ============================================================
alter table objetivos_ahorro enable row level security;

create policy objetivos_select on objetivos_ahorro
  for select using (usuario_id = auth.uid());

create policy objetivos_insert on objetivos_ahorro
  for insert with check (usuario_id = auth.uid());

create policy objetivos_update on objetivos_ahorro
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy objetivos_delete on objetivos_ahorro
  for delete using (usuario_id = auth.uid());

-- ============================================================
-- aportaciones_objetivo (el usuario gestiona las aportaciones de SUS PROPIOS objetivos)
-- ============================================================
alter table aportaciones_objetivo enable row level security;

create policy aportaciones_select on aportaciones_objetivo
  for select using (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );

create policy aportaciones_insert on aportaciones_objetivo
  for insert with check (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );

create policy aportaciones_update on aportaciones_objetivo
  for update
  using (exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid()))
  with check (exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid()));

create policy aportaciones_delete on aportaciones_objetivo
  for delete using (
    exists (select 1 from objetivos_ahorro o where o.id = objetivo_id and o.usuario_id = auth.uid())
  );

-- ============================================================
-- posiciones_patrimonio / patrimonio_historico (individuales — nunca compartidas, ver
-- 0009_patrimonio.sql). patrimonio_historico solo se lee por el cliente: solo la funcion
-- security definer generar_snapshot_patrimonio puede escribir en ella.
-- ============================================================
alter table posiciones_patrimonio enable row level security;

create policy posiciones_patrimonio_select on posiciones_patrimonio
  for select using (usuario_id = auth.uid());

create policy posiciones_patrimonio_insert on posiciones_patrimonio
  for insert with check (usuario_id = auth.uid());

create policy posiciones_patrimonio_update on posiciones_patrimonio
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy posiciones_patrimonio_delete on posiciones_patrimonio
  for delete using (usuario_id = auth.uid());

alter table patrimonio_historico enable row level security;

create policy patrimonio_historico_select on patrimonio_historico
  for select using (
    exists (select 1 from posiciones_patrimonio p where p.id = posicion_id and p.usuario_id = auth.uid())
  );

-- ============================================================
-- Paso operativo fuera de SQL (Supabase Dashboard):
--   1. Authentication -> Providers -> Email -> desactivar "Allow new users to sign up".
--   2. Authentication -> Users -> Add user, para amda.97@gmail.com y lauraplaza403@gmail.com.
--   3. Renombrar los perfiles generados (ver comentario en 0001_schema.sql).
-- ============================================================
