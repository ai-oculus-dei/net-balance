import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';
import type { SubcategoriasPorId } from './taxonomia';
import type { PeriodoConEtiqueta } from './periodos';

// Una "linea" comparada en la pagina de Visualizaciones: una categoria, y opcionalmente una
// subcategoria concreta dentro de ella. `subcategoriaId: null` significa "Todas" — se suman
// todas las subcategorias de esa categoria (seccion 5: balance neto, con signo).
export interface LineaSeleccion {
  id: string;
  colorIndex: number;
  categoriaId: number | null;
  subcategoriaId: number | null;
}

export function lineaEsValida(linea: LineaSeleccion): linea is LineaSeleccion & { categoriaId: number } {
  return linea.categoriaId !== null;
}

export function etiquetaLinea(linea: LineaSeleccion, categorias: Categoria[], subcategorias: Subcategoria[]): string {
  const categoria = categorias.find((c) => c.id === linea.categoriaId);
  if (!categoria) return 'Sin seleccionar';
  if (linea.subcategoriaId === null) return `${categoria.nombre} · Todas`;
  const sub = subcategorias.find((s) => s.id === linea.subcategoriaId);
  return `${categoria.nombre} · ${sub?.nombre ?? '—'}`;
}

function movimientoPerteneceALinea(m: Movimiento, linea: LineaSeleccion, subcategorias: SubcategoriasPorId): boolean {
  const sub = subcategorias.get(m.subcategoria_id);
  if (!sub || sub.categoria_id !== linea.categoriaId) return false;
  if (linea.subcategoriaId !== null && sub.id !== linea.subcategoriaId) return false;
  return true;
}

export interface PuntoSerieLineas {
  mes: string;
  valores: Record<string, number>; // lineaId -> neto del periodo
}

function fechaEnRango(fechaMovimiento: string, rango: { desde: string; hasta: string }): boolean {
  const fechaSolo = fechaMovimiento.slice(0, 10); // "YYYY-MM-DD"
  return fechaSolo >= rango.desde && fechaSolo < rango.hasta;
}

// Serie temporal (un punto por periodo, ya resueltos con las anclas de mes personalizado del
// usuario — ver src/lib/finance/periodos.ts). Cada punto agrupa uno o mas valores, uno por linea.
export function serieTemporalPorLineas(
  movimientos: Movimiento[],
  lineas: LineaSeleccion[],
  subcategorias: SubcategoriasPorId,
  periodos: PeriodoConEtiqueta[]
): PuntoSerieLineas[] {
  const puntos: PuntoSerieLineas[] = periodos.map((p) => ({
    mes: p.etiquetaCorta,
    valores: Object.fromEntries(lineas.map((l) => [l.id, 0])),
  }));

  for (const m of movimientos) {
    const indice = periodos.findIndex((p) => fechaEnRango(m.fecha, p.rango));
    if (indice === -1) continue;
    for (const linea of lineas) {
      if (movimientoPerteneceALinea(m, linea, subcategorias)) {
        puntos[indice].valores[linea.id] += m.importe;
      }
    }
  }

  return puntos.map((p) => ({
    ...p,
    valores: Object.fromEntries(Object.entries(p.valores).map(([id, v]) => [id, Math.round(v * 100) / 100])),
  }));
}

export interface TotalLinea {
  lineaId: string;
  total: number; // neto con signo, sumado en todo el rango
}

export function totalesPorLinea(
  movimientos: Movimiento[],
  lineas: LineaSeleccion[],
  subcategorias: SubcategoriasPorId
): TotalLinea[] {
  return lineas.map((linea) => ({
    lineaId: linea.id,
    total:
      Math.round(
        movimientos
          .filter((m) => movimientoPerteneceALinea(m, linea, subcategorias))
          .reduce((suma, m) => suma + m.importe, 0) * 100
      ) / 100,
  }));
}
