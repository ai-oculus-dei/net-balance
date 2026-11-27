import type { Movimiento } from '../supabase/database.types';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Suma tal cual de todos los movimientos (incluidos Ahorro e Inversiones): el cambio total de
// la cuenta de gastos en el periodo. Solo para sincronizar la cuenta "Gastos" de Patrimonio;
// las metricas de la tarjeta salen de calcularMetricas (bolsas.ts).
export function balanceNetoDelMes(movimientos: Movimiento[]): number {
  return round2(movimientos.reduce((suma, m) => suma + m.importe, 0));
}
