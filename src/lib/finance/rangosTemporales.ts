import { toIsoDate } from './fechas';

// Rangos tipicos de los graficos de un broker. Los datos de patrimonio son DIARIOS (un valor
// por dia, sin intradia), asi que "1D" muestra ayer y hoy: la variacion del ultimo dia.
export type RangoTemporal = '1D' | '1W' | '1M' | '6M' | '1Y' | '5Y';

export const RANGOS_TEMPORALES: RangoTemporal[] = ['1D', '1W', '1M', '6M', '1Y', '5Y'];

export const RANGO_POR_DEFECTO: RangoTemporal = '6M';

// Primer dia (inclusive, "YYYY-MM-DD") que entra en el rango contando hacia atras desde `hoy`.
export function fechaInicioRango(rango: RangoTemporal, hoy: Date = new Date()): string {
  const a = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();
  const inicio = {
    '1D': new Date(a, m, d - 1),
    '1W': new Date(a, m, d - 7),
    '1M': new Date(a, m - 1, d),
    '6M': new Date(a, m - 6, d),
    '1Y': new Date(a - 1, m, d),
    '5Y': new Date(a - 5, m, d),
  }[rango];
  return toIsoDate(inicio);
}

export function filtrarPorRango<T extends { fecha: string }>(puntos: T[], rango: RangoTemporal, hoy: Date = new Date()): T[] {
  const desde = fechaInicioRango(rango, hoy);
  return puntos.filter((p) => p.fecha >= desde);
}

// "YYYY-MM-DD" -> timestamp de la medianoche LOCAL de ese dia (para un eje X temporal).
export function timestampDia(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
}

// Etiquetas del eje X segun lo largo del rango: dias para rangos cortos, mes y año para medios,
// solo año para 5Y.
export function formatoEjeRango(rango: RangoTemporal): (t: number) => string {
  return (t: number) => {
    const fecha = new Date(t);
    if (rango === '5Y') return String(fecha.getFullYear());
    if (rango === '6M' || rango === '1Y') {
      const mes = fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      return `${mes} ${String(fecha.getFullYear()).slice(2)}`;
    }
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
  };
}

// Reduce una lista de marcas a como mucho `maximo`, saltando de forma regular.
function aclarar(ticks: number[], maximo: number): number[] {
  if (ticks.length <= maximo) return ticks;
  const paso = Math.ceil(ticks.length / maximo);
  return ticks.filter((_, i) => i % paso === 0);
}

// Marcas del eje X dentro de [min, max] (como mucho `maximo`), alineadas con lo que muestra la
// etiqueta de cada rango para que nunca se repitan: 1 de enero en 5Y (etiqueta = año), dia 1
// de cada mes en 6M/1Y (etiqueta = mes), y dias repartidos por igual en los rangos cortos.
export function ticksEje(min: number, max: number, rango: RangoTemporal, maximo = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  if (rango === '5Y' || rango === '6M' || rango === '1Y') {
    const inicio = new Date(min);
    const ticks: number[] = [];
    if (rango === '5Y') {
      for (let a = inicio.getFullYear(); ; a++) {
        const t = new Date(a, 0, 1).getTime();
        if (t > max) break;
        if (t >= min) ticks.push(t);
      }
    } else {
      for (let i = 0; ; i++) {
        const t = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1).getTime();
        if (t > max) break;
        if (t >= min) ticks.push(t);
      }
    }
    // Si el tramo con datos es demasiado corto para tener un cambio de año/mes, una marca al inicio.
    return ticks.length > 0 ? aclarar(ticks, maximo) : [min];
  }

  return ticksRepartidos(min, max, maximo);
}

function ticksRepartidos(min: number, max: number, maximo: number): number[] {
  const DIA = 86_400_000;
  const dias = Math.round((max - min) / DIA);
  const n = Math.min(maximo, dias + 1);
  if (n <= 1) return [min];
  const ticks = new Set<number>();
  for (let i = 0; i < n; i++) {
    const t = min + ((max - min) * i) / (n - 1);
    const d = new Date(t);
    ticks.add(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getHours() >= 12 ? 1 : 0)).getTime());
  }
  return [...ticks].filter((t) => t >= min && t <= max).sort((a, b) => a - b);
}
