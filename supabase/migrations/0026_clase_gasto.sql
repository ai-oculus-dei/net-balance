-- ============================================================
-- Clasificacion fijo/variable de cada "bolsa" de gasto, editable desde la app.
--
-- Bolsa = cualquier subcategoria que no sea un ingreso real (Salario, Paga Extra, Variable,
-- Beneficios, Ingreso Extra), Ahorro ni Inversiones. Su neto del periodo (ingresos - gastos)
-- cuenta como gasto fijo o variable segun clase_gasto. NULL = sin clasificar: la app pide
-- clasificarla (aviso arriba y Ajustes -> Gastos fijos y variables).
-- Sustituye a es_gasto_fijo / es_ingreso_condicional, que la app ya no usa.
-- Ver src/lib/finance/bolsas.ts.
-- ============================================================

alter table subcategorias
  add column if not exists clase_gasto text check (clase_gasto in ('fijo', 'variable'));

update subcategorias set clase_gasto = 'fijo' where nombre in (
  'Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Limpieza', 'Línea Móvil', 'Facturas',
  'Letra Coche', 'Seguro Coche', 'Combustible', 'Supermercado', 'Seguro Médico', 'Gimnasio',
  'Clases de Padel', 'Crossfit', 'Suscripciones'
);

update subcategorias set clase_gasto = 'variable' where nombre in (
  'TTP', 'Taxi/Uber', 'Parking', 'Peaje', 'Mantenimiento', 'Restaurantes', 'Comida a Domicilio',
  'Café', 'Refresco', 'Alcohol', 'Expendedora', 'Chino', 'Farmacia', 'Higiene', 'Peluquería',
  'Dentista', 'Fisioterapia', 'Partido Padel', 'Material Deportivo', 'Running', 'Viajes', 'Cines',
  'Conciertos', 'Espectáculos', 'Actividades', 'Videojuegos', 'Apuestas/Lotería', 'Libros',
  'Discotecas', 'Ropa', 'Electrónica', 'Muebles', 'Decoración', 'Regalos', 'Juguetes',
  'Impuestos', 'Efectivo'
);

-- La taxonomia sigue siendo de solo lectura salvo esta columna.
revoke update on subcategorias from authenticated, anon;
grant update (clase_gasto) on subcategorias to authenticated;

drop policy if exists subcategorias_update_clase on subcategorias;
create policy subcategorias_update_clase on subcategorias
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
