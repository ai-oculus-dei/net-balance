import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';

export type SubcategoriasPorId = Map<number, Subcategoria>;

export function indexarSubcategorias(subcategorias: Subcategoria[]): SubcategoriasPorId {
  return new Map(subcategorias.map((s) => [s.id, s]));
}

// Ingreso real del mes (seccion 5): neto de las subcategorias marcadas es_ingreso_real
// (Salario, Paga Extra, Variable, Beneficios, Ingreso Extra) SIEMPRE, con signo — mas el
// balance neto de las subcategorias "condicionales" (Impuestos, Ahorro, Efectivo,
// Inversiones), pero cada una de estas SOLO si su propio balance ese mes es positivo (p.ej.
// una devolucion de impuestos, o retirar de Ahorro mas de lo aportado). Si el balance de una
// condicional es negativo, no resta del ingreso real: simplemente no suma nada.
export function ingresoRealDelMes(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): number {
  const incondicional = movimientos
    .filter((m) => subcategorias.get(m.subcategoria_id)?.es_ingreso_real)
    .reduce((suma, m) => suma + m.importe, 0);

  const balancePorCondicional = new Map<number, number>();
  for (const m of movimientos) {
    const sub = subcategorias.get(m.subcategoria_id);
    if (!sub?.es_ingreso_condicional) continue;
    balancePorCondicional.set(sub.id, (balancePorCondicional.get(sub.id) ?? 0) + m.importe);
  }
  const condicional = Array.from(balancePorCondicional.values())
    .filter((balance) => balance > 0)
    .reduce((suma, balance) => suma + balance, 0);

  return Math.round((incondicional + condicional) * 100) / 100;
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
