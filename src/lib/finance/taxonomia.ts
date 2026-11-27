import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';
import { netoPorBolsa } from './bolsas';

export type SubcategoriasPorId = Map<number, Subcategoria>;

export function indexarSubcategorias(subcategorias: Subcategoria[]): SubcategoriasPorId {
  return new Map(subcategorias.map((s) => [s.id, s]));
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
  // Mismo neteo por bolsa que las metricas (ver bolsas.ts).
  const netoPorSubcategoriaId = netoPorBolsa(movimientos);

  const resultado: BalanceSubcategoria[] = [];
  for (const [subcategoriaId, neto] of netoPorSubcategoriaId) {
    const sub = subcategorias.get(subcategoriaId);
    if (!sub) continue;
    resultado.push({
      subcategoriaId,
      categoriaId: sub.categoria_id,
      categoria: categoriaPorId.get(sub.categoria_id) ?? '—',
      subcategoria: sub.nombre,
      neto,
    });
  }

  return resultado.sort((a, b) => a.categoriaId - b.categoriaId || a.subcategoriaId - b.subcategoriaId);
}
