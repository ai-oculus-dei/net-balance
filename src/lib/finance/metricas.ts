import type { Movimiento } from '../supabase/database.types';
import type { SubcategoriasPorId } from './taxonomia';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Balance neto del mes: todo lo ingresado menos todo lo gastado, tal cual, sin excluir nada
// (incluye tambien traspasos como Ahorro/Inversiones) — el cambio total del registro ese mes.
export function balanceNetoDelMes(movimientos: Movimiento[]): number {
  return round2(movimientos.reduce((suma, m) => suma + m.importe, 0));
}

function balanceDeFlag(
  movimientos: Movimiento[],
  subcategorias: SubcategoriasPorId,
  flag: 'es_ahorro' | 'es_inversion'
): number {
  return movimientos
    .filter((m) => subcategorias.get(m.subcategoria_id)?.[flag])
    .reduce((suma, m) => suma + m.importe, 0);
}

// Ahorro total del mes (seccion 7): un gasto (importe negativo) en "Ahorro" es dinero que de
// verdad se ha guardado; un ingreso (positivo) es una retirada de vuelta a la cuenta de
// gastos. Se invierte el signo para que el ahorro real quede en positivo.
export function ahorroTotalDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  return round2(-balanceDeFlag(movimientos, subcategorias, 'es_ahorro'));
}

// Inversion total del mes: mismo tratamiento de signo que el ahorro, para "Inversiones".
export function inversionTotalDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  return round2(-balanceDeFlag(movimientos, subcategorias, 'es_inversion'));
}

// Gasto real total del mes: magnitud de todos los gastos (importe negativo) EXCEPTO los
// traspasos (Ahorro/Inversiones no son gasto real, siguen siendo dinero tuyo en otra cuenta).
export function gastoRealTotalDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  const total = movimientos
    .filter((m) => m.importe < 0 && !subcategorias.get(m.subcategoria_id)?.es_traspaso)
    .reduce((suma, m) => suma + m.importe, 0);
  return round2(-total);
}

// Gasto variable del mes: la parte del gasto real que no es un gasto fijo (seccion 6) — lo
// gastado por decision del mes en vez de compromisos recurrentes.
export function gastoVariableDelMes(gastoRealTotal: number, gastosFijos: number): number {
  return round2(gastoRealTotal - gastosFijos);
}

// Tasa de ahorro del mes: que parte del ingreso real se ha ahorrado de verdad — el
// equivalente personal a un "margen": cuanto de lo que entra se queda. Null si no hay
// ingreso real ese mes (no tiene sentido dividir entre 0 o negativo).
export function tasaAhorroDelMes(ahorroTotal: number, ingresoReal: number): number | null {
  if (ingresoReal <= 0) return null;
  return round2((ahorroTotal / ingresoReal) * 100);
}

// Tasa de inversion del mes: mismo tratamiento que la tasa de ahorro, para la inversion.
export function tasaInversionDelMes(inversionTotal: number, ingresoReal: number): number | null {
  if (ingresoReal <= 0) return null;
  return round2((inversionTotal / ingresoReal) * 100);
}

// Margen operativo del mes: que parte del ingreso real queda tras cubrir los gastos fijos —
// el equivalente personal a un margen operativo de negocio. Null si no hay ingreso real ese mes.
export function margenOperativoDelMes(ingresoReal: number, gastosFijos: number): number | null {
  if (ingresoReal <= 0) return null;
  return round2(((ingresoReal - gastosFijos) / ingresoReal) * 100);
}
