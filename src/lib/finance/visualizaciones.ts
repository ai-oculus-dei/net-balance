import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';
import type { SubcategoriasPorId } from './taxonomia';

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
  valores: Record<string, number>; // lineaId -> neto del mes
}

// Serie temporal mensual (uno o mas valores por mes, uno por linea) entre `desde` y `hasta`
// (ambos primer dia de mes, `hasta` inclusive).
export function serieTemporalPorLineas(
  movimientos: Movimiento[],
  lineas: LineaSeleccion[],
  subcategorias: SubcategoriasPorId,
  desde: Date,
  hasta: Date
): PuntoSerieLineas[] {
  const totalMeses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1;
  const puntos: PuntoSerieLineas[] = [];
  for (let i = 0; i < Math.max(totalMeses, 0); i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
    puntos.push({
      mes: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      valores: Object.fromEntries(lineas.map((l) => [l.id, 0])),
    });
  }

  for (const m of movimientos) {
    const fechaMov = new Date(m.fecha);
    const indice = (fechaMov.getFullYear() - desde.getFullYear()) * 12 + (fechaMov.getMonth() - desde.getMonth());
    if (indice < 0 || indice >= puntos.length) continue;
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
