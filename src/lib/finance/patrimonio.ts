import type { PatrimonioHistorico, PosicionPatrimonio, TipoPosicionPatrimonio } from '../supabase/database.types';
import type { PuntoSerieLineas } from './visualizaciones';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export type GrupoPatrimonio = 'renta_variable' | 'renta_fija' | 'efectivo';

export const ETIQUETA_GRUPO: Record<GrupoPatrimonio, string> = {
  renta_variable: 'Renta Variable',
  renta_fija: 'Renta Fija',
  efectivo: 'Efectivo',
};

export const ETIQUETA_TIPO: Record<TipoPosicionPatrimonio, string> = {
  stock: 'Stock',
  etf: 'ETFs',
  fondo_indexado: 'Fondo Indexado',
  fondo_monetario: 'Fondo Monetario',
  cuenta_remunerada: 'Cuenta Remunerada',
  cuenta_ahorro: 'Cuenta de Ahorro',
  commodity: 'Commodity',
  cuenta_corriente: 'Cuenta Corriente',
  criptomoneda: 'Criptomoneda',
};

// Mapeo fijo tipo -> grupo de agrupacion. Nunca se guarda: se calcula siempre a partir de `tipo`.
const GRUPO_POR_TIPO: Record<TipoPosicionPatrimonio, GrupoPatrimonio> = {
  stock: 'renta_variable',
  etf: 'renta_variable',
  fondo_indexado: 'renta_variable',
  commodity: 'renta_variable',
  criptomoneda: 'renta_variable',
  fondo_monetario: 'renta_fija',
  cuenta_remunerada: 'renta_fija',
  cuenta_ahorro: 'renta_fija',
  cuenta_corriente: 'efectivo',
};

export function grupoDePosicion(tipo: TipoPosicionPatrimonio): GrupoPatrimonio {
  return GRUPO_POR_TIPO[tipo];
}

export const TIPOS_POR_GRUPO: Record<GrupoPatrimonio, TipoPosicionPatrimonio[]> = {
  renta_variable: ['stock', 'etf', 'fondo_indexado', 'commodity', 'criptomoneda'],
  renta_fija: ['fondo_monetario', 'cuenta_remunerada', 'cuenta_ahorro'],
  efectivo: ['cuenta_corriente'],
};

// Tipos con "unidades" reales (Qty + precio por unidad tiene sentido, y el formulario ofrece
// el toggle total/por-unidad). El resto son posiciones "de saldo": cantidad fija en 1, un
// unico valor total.
const TIPOS_POR_UNIDAD = new Set<TipoPosicionPatrimonio>(['stock', 'etf', 'fondo_indexado', 'commodity', 'criptomoneda']);

export function esTipoPorUnidad(tipo: TipoPosicionPatrimonio): boolean {
  return TIPOS_POR_UNIDAD.has(tipo);
}

// Tipos "de saldo" con rentabilidad conocida (TAE): el formulario ofrece fijar un % en vez de
// tener que actualizar el precio actual a mano — ver valorConTae mas abajo.
const TIPOS_CON_TAE = new Set<TipoPosicionPatrimonio>(['fondo_monetario', 'cuenta_remunerada', 'cuenta_ahorro']);

export function esTipoConTae(tipo: TipoPosicionPatrimonio): boolean {
  return TIPOS_CON_TAE.has(tipo);
}

const DIAS_ANIO = 365;

// Dias naturales completos entre fechaCompra ("YYYY-MM-DD") y hoy, con los mismos componentes
// locales que toIsoDate (fechas.ts) — nunca negativo. Coincide exactamente con la resta de
// fechas `date - date` de Postgres usada en generar_snapshot_patrimonio.
function diasEntre(fechaCompra: string, hoy: Date): number {
  const [anio, mes, dia] = fechaCompra.split('-').map(Number);
  const inicio = new Date(anio, mes - 1, dia);
  const hoyTrunc = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((hoyTrunc.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(dias, 0);
}

// Interes simple anualizado: capital * (1 + tae% * dias/365). Usado por las posiciones "de
// saldo" con rentabilidad conocida en vez de un precio actual que haya que actualizar a mano
// (Fondo Monetario, Cuenta Remunerada, Cuenta de Ahorro) — sin depender de ninguna fuente
// externa. Mismo calculo que generar_snapshot_patrimonio (SQL), para que la vista en vivo y el
// historico coincidan.
export function valorConTae(precioCompraUnitario: number, tae: number, fechaCompra: string, hoy: Date = new Date()): number {
  const dias = diasEntre(fechaCompra, hoy);
  return precioCompraUnitario * (1 + (tae / 100) * (dias / DIAS_ANIO));
}

type PosicionValor = Pick<
  PosicionPatrimonio,
  'cantidad' | 'precio_compra_unitario' | 'precio_actual_unitario' | 'fecha_compra' | 'tae'
>;

export function precioCompraTotal(p: Pick<PosicionValor, 'cantidad' | 'precio_compra_unitario'>): number {
  return round2(p.cantidad * p.precio_compra_unitario);
}

// Precio unitario "en vivo": si la posicion tiene tae, se calcula por formula; si no, es el
// precio actual guardado a mano.
export function precioActualUnitarioEfectivo(
  p: Pick<PosicionValor, 'precio_compra_unitario' | 'precio_actual_unitario' | 'fecha_compra' | 'tae'>,
  hoy: Date = new Date()
): number {
  if (p.tae !== null) return valorConTae(p.precio_compra_unitario, p.tae, p.fecha_compra, hoy);
  return p.precio_actual_unitario ?? 0;
}

export function precioActualTotal(p: Pick<PosicionValor, 'cantidad' | 'precio_compra_unitario' | 'precio_actual_unitario' | 'fecha_compra' | 'tae'>, hoy: Date = new Date()): number {
  return round2(p.cantidad * precioActualUnitarioEfectivo(p, hoy));
}

export interface PnL {
  eur: number;
  pct: number | null; // null si el coste de compra es 0 (no tiene sentido dividir)
}

export function calcularPnL(p: PosicionValor, hoy: Date = new Date()): PnL {
  const compra = precioCompraTotal(p);
  const actual = precioActualTotal(p, hoy);
  const eur = round2(actual - compra);
  const pct = compra > 0 ? round2((eur / compra) * 100) : null;
  return { eur, pct };
}

export function patrimonioTotalActual(posiciones: PosicionPatrimonio[], hoy: Date = new Date()): number {
  return round2(posiciones.reduce((suma, p) => suma + precioActualTotal(p, hoy), 0));
}

export function patrimonioPorGrupo(posiciones: PosicionPatrimonio[], hoy: Date = new Date()): Record<GrupoPatrimonio, number> {
  const totales: Record<GrupoPatrimonio, number> = { renta_variable: 0, renta_fija: 0, efectivo: 0 };
  for (const p of posiciones) {
    totales[grupoDePosicion(p.tipo)] += precioActualTotal(p, hoy);
  }
  return {
    renta_variable: round2(totales.renta_variable),
    renta_fija: round2(totales.renta_fija),
    efectivo: round2(totales.efectivo),
  };
}

function etiquetaFecha(fecha: string): string {
  // fecha viene como "YYYY-MM-DD" (columna date); se parsea con los componentes locales para
  // no arrastrar el mismo problema de zona horaria que toISOString (ver fechas.ts).
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// Serie temporal del patrimonio total (todas las posiciones sumadas por fecha), shaped para
// SerieTemporalLineasChart con una unica linea ('total').
export function historicoTotalPorDia(historico: PatrimonioHistorico[]): PuntoSerieLineas[] {
  const porFecha = new Map<string, number>();
  for (const h of historico) {
    porFecha.set(h.fecha, (porFecha.get(h.fecha) ?? 0) + h.valor_total);
  }
  return Array.from(porFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => ({ mes: etiquetaFecha(fecha), valores: { total: round2(total) } }));
}

export interface LineaHistoricoPosicion {
  id: string;
  colorIndex: number;
  etiqueta: string;
}

export interface HistoricoPorPosicion {
  puntos: PuntoSerieLineas[];
  lineas: LineaHistoricoPosicion[];
}

// Serie temporal multi-linea (una linea por posicion), limitada a como maximo `maxLineas`
// posiciones — las de mayor valor actual — para no superar el techo de la paleta categorica
// (colorsCategoricos.ts, 8 colores distinguibles por daltonismo).
export function historicoPorPosicion(
  posiciones: PosicionPatrimonio[],
  historico: PatrimonioHistorico[],
  maxLineas: number
): HistoricoPorPosicion {
  const elegidas = [...posiciones].sort((a, b) => precioActualTotal(b) - precioActualTotal(a)).slice(0, maxLineas);
  const idsElegidos = new Set(elegidas.map((p) => p.id));

  const fechas = Array.from(new Set(historico.filter((h) => idsElegidos.has(h.posicion_id)).map((h) => h.fecha))).sort();

  const puntos: PuntoSerieLineas[] = fechas.map((fecha) => {
    const valores: Record<string, number> = {};
    for (const h of historico) {
      if (h.fecha === fecha && idsElegidos.has(h.posicion_id)) valores[h.posicion_id] = h.valor_total;
    }
    return { mes: etiquetaFecha(fecha), valores };
  });

  const lineas: LineaHistoricoPosicion[] = elegidas.map((p, indice) => ({
    id: p.id,
    colorIndex: indice,
    etiqueta: p.nombre,
  }));

  return { puntos, lineas };
}

// Conversiones puras para el toggle total/por-unidad del formulario de alta/edicion.
export function unitarioDesdeTotal(total: number, cantidad: number): number {
  return cantidad > 0 ? total / cantidad : 0;
}

export function totalDesdeUnitario(unitario: number, cantidad: number): number {
  return unitario * cantidad;
}
