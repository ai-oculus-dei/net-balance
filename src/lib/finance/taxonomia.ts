import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';

export type SubcategoriasPorId = Map<number, Subcategoria>;

export function indexarSubcategorias(subcategorias: Subcategoria[]): SubcategoriasPorId {
  return new Map(subcategorias.map((s) => [s.id, s]));
}

// Ingreso real del mes (seccion 5): neto de las subcategorias marcadas es_ingreso_real
// (Salario, Paga Extra, Variable, Beneficios, Ingreso Extra). Se sigue la regla de "balance
// neto por categoria" de la seccion 3 tambien aqui: se suman con signo, no solo positivos.
export function ingresoRealDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  return movimientos
    .filter((m) => subcategorias.get(m.subcategoria_id)?.es_ingreso_real)
    .reduce((suma, m) => suma + m.importe, 0);
}

// Gastos fijos del mes (seccion 6): movimientos generados desde gastos_recurrentes.
// Se almacenan con importe negativo (son gastos), se devuelve como magnitud positiva
// para poder restarla directamente en calcularDisponible.
export function gastosFijosDelMes(movimientos: Movimiento[]): number {
  const total = movimientos.filter((m) => m.es_recurrente).reduce((suma, m) => suma + m.importe, 0);
  return -total;
}

export interface BalanceCategoria {
  categoria: string;
  neto: number;
}

// Balance neto por categoria (seccion 3 y 9): agrega el importe (con signo) de todos los
// movimientos de cada categoria, para reflejar el coste/ingreso real tras reembolsos, etc.
export function balancePorCategoria(
  movimientos: Movimiento[],
  subcategorias: SubcategoriasPorId,
  categorias: Categoria[]
): BalanceCategoria[] {
  const netoPorCategoriaId = new Map<number, number>();

  for (const m of movimientos) {
    const sub = subcategorias.get(m.subcategoria_id);
    if (!sub) continue;
    netoPorCategoriaId.set(sub.categoria_id, (netoPorCategoriaId.get(sub.categoria_id) ?? 0) + m.importe);
  }

  return categorias
    .filter((c) => netoPorCategoriaId.has(c.id))
    .map((c) => ({ categoria: c.nombre, neto: Math.round((netoPorCategoriaId.get(c.id) ?? 0) * 100) / 100 }));
}
