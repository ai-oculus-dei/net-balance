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

// Gastos fijos del mes (seccion 6): balance neto (gasto - ingreso, con signo) de las
// subcategorias marcadas es_gasto_fijo (Alquiler, Luz, Supermercado, Gimnasio...). Igual que
// con el ingreso real, un reembolso dentro de una de estas subcategorias reduce el gasto fijo
// neto en vez de tratarse aparte. Se devuelve como magnitud positiva para poder restarla
// directamente en calcularDisponible.
export function gastosFijosDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  const balance = movimientos
    .filter((m) => subcategorias.get(m.subcategoria_id)?.es_gasto_fijo)
    .reduce((suma, m) => suma + m.importe, 0);
  return -balance;
}

export interface BalanceSubcategoria {
  subcategoriaId: number;
  categoriaId: number;
  categoria: string;
  subcategoria: string;
  neto: number;
}

// Balance neto por subcategoria (seccion 9), solo de las que han tenido movimientos ese mes —
// para la lista de "Este mes" del Dashboard. Ordenado por categoria y luego subcategoria,
// siguiendo el orden natural de la taxonomia (seccion 5).
export function balancePorSubcategoria(
  movimientos: Movimiento[],
  subcategorias: SubcategoriasPorId,
  categorias: Categoria[]
): BalanceSubcategoria[] {
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c.nombre]));
  const netoPorSubcategoriaId = new Map<number, number>();

  for (const m of movimientos) {
    netoPorSubcategoriaId.set(m.subcategoria_id, (netoPorSubcategoriaId.get(m.subcategoria_id) ?? 0) + m.importe);
  }

  const resultado: BalanceSubcategoria[] = [];
  for (const [subcategoriaId, neto] of netoPorSubcategoriaId) {
    const sub = subcategorias.get(subcategoriaId);
    if (!sub) continue;
    resultado.push({
      subcategoriaId,
      categoriaId: sub.categoria_id,
      categoria: categoriaPorId.get(sub.categoria_id) ?? '—',
      subcategoria: sub.nombre,
      neto: Math.round(neto * 100) / 100,
    });
  }

  return resultado.sort((a, b) => a.categoriaId - b.categoriaId || a.subcategoriaId - b.subcategoriaId);
}
