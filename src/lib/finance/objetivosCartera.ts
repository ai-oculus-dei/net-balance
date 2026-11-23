import type { PosicionPatrimonio, TipoPosicionPatrimonio } from '../supabase/database.types';
import { agruparPorActivo, claveActivo, claveCuenta, round2 } from './patrimonio';

// ============================================================
// Objetivos de cartera (etiqueta nucleo/satelite + % objetivo)
//
// Se fijan por "unidad de cartera" (ver supabase/migrations/0021_objetivos_cartera.sql):
//   - un bloque con toda la liquidez (cuentas y fondos monetarios) = Fondo de Emergencia,
//   - un bloque con todos los fondos indexados de renta variable,
//   - y cada uno del resto de activos (stocks, ETFs, fondos indexados RF, cripto, commodities)
//     por separado.
// ============================================================

export type EtiquetaCartera = 'nucleo' | 'satelite';

export const ETIQUETA_CARTERA: Record<EtiquetaCartera, string> = {
  nucleo: 'Núcleo',
  satelite: 'Satélite',
};

// El objetivo se puede fijar en % del patrimonio (objetivoPct) o en euros (objetivoEur); como
// mucho uno de los dos. Uno en euros es "dinamico": su % equivalente se recalcula con el
// patrimonio total de cada momento (ver objetivoEfectivoPct).
export interface ObjetivoCartera {
  clave: string;
  etiqueta: EtiquetaCartera | null;
  objetivoPct: number | null;
  objetivoEur: number | null;
}

// % objetivo a aplicar ahora mismo: el fijado tal cual, o el equivalente de los euros sobre el
// patrimonio total (como mucho 100 %). null si no tiene objetivo o no hay patrimonio.
export function objetivoEfectivoPct(o: Pick<ObjetivoCartera, 'objetivoPct' | 'objetivoEur'>, total: number): number | null {
  if (o.objetivoPct !== null) return o.objetivoPct;
  if (o.objetivoEur === null || total <= 0) return null;
  return round2(Math.min(100, (o.objetivoEur / total) * 100));
}

// Patrimonio total que reparten las unidades (base de los %).
export function totalCartera(unidades: UnidadCartera[]): number {
  return round2(unidades.reduce((s, u) => s + u.valor, 0));
}

export const CLAVE_BLOQUE_LIQUIDEZ = 'bloque:liquidez';
export const CLAVE_BLOQUE_INDEXADOS_RV = 'bloque:indexados_rv';

const TIPOS_LIQUIDEZ = new Set<TipoPosicionPatrimonio>([
  'cuenta_corriente',
  'cuenta_remunerada',
  'cuenta_ahorro',
  'fondo_monetario',
]);

const NOMBRE_BLOQUE: Record<string, string> = {
  [CLAVE_BLOQUE_LIQUIDEZ]: 'Fondo de Emergencia',
  [CLAVE_BLOQUE_INDEXADOS_RV]: 'Fondos indexados RV',
};

export function claveUnidad(p: Pick<PosicionPatrimonio, 'tipo' | 'ticker' | 'mercado' | 'nombre'>): string {
  if (TIPOS_LIQUIDEZ.has(p.tipo)) return CLAVE_BLOQUE_LIQUIDEZ;
  if (p.tipo === 'fondo_indexado_rv') return CLAVE_BLOQUE_INDEXADOS_RV;
  // Misma clave que agruparPorActivo: todas las compras de un mismo activo, una sola unidad.
  return `activo:${claveActivo(p.ticker, p.mercado) ?? claveCuenta(p.tipo, p.nombre)}`;
}

export interface UnidadCartera {
  clave: string;
  nombre: string;
  esBloque: boolean;
  ticker: string | null; // solo en activos sueltos con ticker
  numActivos: number; // cuantos activos agrupa (1 en los sueltos)
  valor: number;
  pct: number; // peso dentro del patrimonio total (0-100)
}

export const NOMBRE_FONDO_EMERGENCIA = NOMBRE_BLOQUE[CLAVE_BLOQUE_LIQUIDEZ];

// Valor del Fondo de Emergencia: toda la liquidez, cuentas y fondos monetarios (bloque:liquidez). Va aparte del
// reparto de cartera, con su propio objetivo en euros (ver FondoEmergenciaCard).
export function valorFondoEmergencia(posicionesActivas: PosicionPatrimonio[], hoy: Date = new Date()): number {
  return round2(
    agruparPorActivo(posicionesActivas, hoy)
      .filter((a) => claveUnidad(a) === CLAVE_BLOQUE_LIQUIDEZ)
      .reduce((s, a) => s + a.valorActualTotal, 0)
  );
}

// Unidades con valor positivo, de mayor a menor peso. El Fondo de Emergencia (cuentas y fondos
// monetarios) queda fuera: el % es sobre el resto del patrimonio, lo que de verdad se reparte entre
// inversiones.
export function unidadesCartera(posicionesActivas: PosicionPatrimonio[], hoy: Date = new Date()): UnidadCartera[] {
  const activos = agruparPorActivo(posicionesActivas, hoy).filter((a) => claveUnidad(a) !== CLAVE_BLOQUE_LIQUIDEZ);
  const total = activos.reduce((s, a) => s + a.valorActualTotal, 0);

  const porClave = new Map<string, Omit<UnidadCartera, 'pct'>>();
  for (const a of activos) {
    const clave = claveUnidad(a);
    const existente = porClave.get(clave);
    if (existente) {
      existente.valor = round2(existente.valor + a.valorActualTotal);
      existente.numActivos += 1;
    } else {
      const esBloque = clave.startsWith('bloque:');
      porClave.set(clave, {
        clave,
        nombre: esBloque ? NOMBRE_BLOQUE[clave] : a.nombre,
        esBloque,
        ticker: esBloque ? null : a.ticker,
        numActivos: 1,
        valor: a.valorActualTotal,
      });
    }
  }

  return Array.from(porClave.values())
    .filter((u) => u.valor > 0)
    .map((u) => ({ ...u, pct: total > 0 ? round2((u.valor / total) * 100) : 0 }))
    .sort((a, b) => b.valor - a.valor);
}

// Margen de tolerancia (en puntos porcentuales) alrededor de un objetivo: el menor entre 5
// puntos y el 40 % del propio objetivo. Asi un objetivo pequeño tolera desviaciones pequeñas en
// terminos absolutos pero grandes en relativo (5 % -> ±2, es decir 3-7 %), y uno grande no pasa
// de ±5 puntos (70 % -> 65-75 %).
export function margenObjetivo(objetivoPct: number): number {
  return round2(Math.min(5, 0.4 * objetivoPct));
}

export type EstadoObjetivo = 'en_rango' | 'por_encima' | 'por_debajo';

export function estadoObjetivo(pct: number, objetivoPct: number): EstadoObjetivo {
  const margen = margenObjetivo(objetivoPct);
  if (pct > objetivoPct + margen) return 'por_encima';
  if (pct < objetivoPct - margen) return 'por_debajo';
  return 'en_rango';
}

export interface DesviacionCartera {
  clave: string;
  nombre: string;
  pct: number;
  objetivoPct: number;
  margen: number;
  estado: Exclude<EstadoObjetivo, 'en_rango'>;
}

// Unidades con objetivo que se salen de su margen. Un objetivo de una unidad que ya no tiene
// valor (p.ej. vendida del todo) cuenta como 0 %, con el nombre que se le haya pasado; si no se
// conoce el nombre, se omite (no hay nada que enseñar).
export function desviacionesCartera(unidades: UnidadCartera[], objetivos: ObjetivoCartera[]): DesviacionCartera[] {
  const porClave = new Map(unidades.map((u) => [u.clave, u]));
  const total = totalCartera(unidades);
  const resultado: DesviacionCartera[] = [];
  for (const o of objetivos) {
    if (o.clave === CLAVE_BLOQUE_LIQUIDEZ) continue; // el Fondo de Emergencia va aparte
    const objetivoPct = objetivoEfectivoPct(o, total);
    if (objetivoPct === null) continue;
    const unidad = porClave.get(o.clave);
    const nombre = unidad?.nombre ?? NOMBRE_BLOQUE[o.clave];
    if (!nombre) continue;
    const pct = unidad?.pct ?? 0;
    const estado = estadoObjetivo(pct, objetivoPct);
    if (estado === 'en_rango') continue;
    resultado.push({ clave: o.clave, nombre, pct, objetivoPct, margen: margenObjetivo(objetivoPct), estado });
  }
  // Las mas desviadas primero.
  return resultado.sort((a, b) => Math.abs(b.pct - b.objetivoPct) - Math.abs(a.pct - a.objetivoPct));
}

// Peso total de las unidades con cada etiqueta (sin etiqueta no cuenta).
export function pesoPorEtiqueta(unidades: UnidadCartera[], objetivos: ObjetivoCartera[]): Record<EtiquetaCartera, number> {
  const etiquetaPorClave = new Map(objetivos.map((o) => [o.clave, o.etiqueta]));
  const peso: Record<EtiquetaCartera, number> = { nucleo: 0, satelite: 0 };
  for (const u of unidades) {
    const e = etiquetaPorClave.get(u.clave);
    if (e) peso[e] = round2(peso[e] + u.pct);
  }
  return peso;
}

// Acepta "5", "5.5" y "5,5" (el teclado del iPhone en español escribe coma). null si esta vacio;
// NaN si no es un numero valido o se sale de 0-100.
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace('%', '').replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0 || n > 100) return NaN;
  return round2(n);
}

// Importe en euros escrito a mano: "6000", "6.000", "6000,50", "6.000,50 €". null si esta
// vacio; NaN si no es un numero valido o es negativo.
export function parsearEuros(texto: string): number | null {
  let limpio = texto.trim().replace(/€/g, '').replace(/\s/g, '');
  if (limpio === '') return null;
  if (limpio.includes(',')) limpio = limpio.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replace(/\./g, ''); // puntos de miles
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return round2(n);
}
