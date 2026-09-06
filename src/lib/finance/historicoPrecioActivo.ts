import type { PosicionPatrimonio, PrecioHistoricoActivo, VentaPatrimonioLote } from '../supabase/database.types';
import { toIsoDate } from './fechas';

// Fichero de bajo nivel sin dependencia de patrimonio.ts (que a su vez importa de aqui para el
// historico total/por activo) — round8/round2 y la normalizacion de ticker+mercado se duplican
// aqui a proposito para no crear un ciclo de imports entre los dos ficheros.
function round8(v: number): number {
  return Math.round(v * 1e8) / 1e8;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function claveActivoNormalizada(ticker: string, mercado: string | null): string {
  return `${ticker.trim().toLowerCase()}|${(mercado ?? '').trim().toLowerCase()}`;
}

function siguienteDiaIso(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return toIsoDate(new Date(anio, mes - 1, dia + 1));
}

// Forma reducida de VentaPatrimonioLote que necesita este fichero (evita acoplar todo a la fila
// completa de la tabla).
export interface VentaLote {
  posicionId: string;
  fecha: string;
  cantidadConsumida: number;
}

export function ventaLoteDesdeFila(fila: VentaPatrimonioLote): VentaLote {
  return { posicionId: fila.posicion_id, fecha: fila.fecha, cantidadConsumida: fila.cantidad_consumida };
}

// Forma reducida de PrecioHistoricoActivo (ticker/mercado normalizados igual que claveActivo).
export interface PrecioDiarioActivo {
  ticker: string;
  mercado: string;
  fecha: string;
  precioUnitario: number;
}

export function precioDiarioDesdeFila(fila: PrecioHistoricoActivo): PrecioDiarioActivo {
  return { ticker: fila.ticker, mercado: fila.mercado, fecha: fila.fecha, precioUnitario: fila.precio_unitario };
}

// Cuantas unidades de UN lote concreto seguian en cartera en `fecha` (inclusive): su cantidad
// original menos lo ya vendido de el hasta ese dia — ver ventas_patrimonio_lotes. 0 si `fecha`
// es anterior a la compra.
export function cantidadLoteEnFecha(
  lote: Pick<PosicionPatrimonio, 'id' | 'cantidad_original' | 'fecha_compra'>,
  ventasDelActivo: VentaLote[],
  fecha: string
): number {
  if (fecha < lote.fecha_compra) return 0;
  const vendido = ventasDelActivo
    .filter((v) => v.posicionId === lote.id && v.fecha <= fecha)
    .reduce((suma, v) => suma + v.cantidadConsumida, 0);
  return round8(lote.cantidad_original - vendido);
}

export interface PuntoHistoricoActivo {
  fecha: string;
  precioUnitario: number;
  cantidadTotal: number;
  valorTotal: number;
}

// Activo minimo que hace falta para reconstruir su historico: TODOS sus lotes (activos y
// archivados — un lote ya vendido del todo sigue haciendo falta para el historico de ANTES de
// venderlo, y para que una venta parcial de un lote que sigue activo tambien se refleje).
export interface ActivoParaHistorico {
  ticker: string | null;
  mercado: string | null;
  lotes: PosicionPatrimonio[];
}

// Serie diaria (precio unitario + valor total en cartera) de un activo, desde la fecha de su
// compra mas antigua hasta hoy, con relleno hacia delante en dias sin cotizacion (fin de semana,
// festivo) usando el ultimo precio conocido — para que el eje sea continuo dia a dia, igual que
// el resto de graficos de la app. Vacio si el activo no tiene ticker o no hay ningun precio
// guardado todavia para el (p.ej. el cron aun no ha corrido tras dar de alta la posicion).
export function serieHistoricoActivo(
  activo: ActivoParaHistorico,
  ventasLotes: VentaLote[],
  preciosHistoricos: PrecioDiarioActivo[],
  hoy: Date = new Date()
): PuntoHistoricoActivo[] {
  if (!activo.ticker || activo.lotes.length === 0) return [];
  const clave = claveActivoNormalizada(activo.ticker, activo.mercado);
  const precios = preciosHistoricos
    .filter((p) => `${p.ticker.trim().toLowerCase()}|${p.mercado.trim().toLowerCase()}` === clave)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (precios.length === 0) return [];

  const ventasDelActivo = ventasLotes.filter((v) => activo.lotes.some((l) => l.id === v.posicionId));
  const fechaMasAntigua = [...activo.lotes].sort((a, b) => a.fecha_compra.localeCompare(b.fecha_compra))[0].fecha_compra;
  const hoyIso = toIsoDate(hoy);
  const desde = fechaMasAntigua > precios[0].fecha ? fechaMasAntigua : precios[0].fecha;

  const puntos: PuntoHistoricoActivo[] = [];
  let indicePrecio = 0;
  let precioActual = precios[0].precioUnitario;

  for (let fecha = desde; fecha <= hoyIso; fecha = siguienteDiaIso(fecha)) {
    while (indicePrecio < precios.length && precios[indicePrecio].fecha <= fecha) {
      precioActual = precios[indicePrecio].precioUnitario;
      indicePrecio++;
    }
    const cantidadTotal = round8(
      activo.lotes.reduce((suma, lote) => suma + cantidadLoteEnFecha(lote, ventasDelActivo, fecha), 0)
    );
    puntos.push({ fecha, precioUnitario: precioActual, cantidadTotal, valorTotal: round2(cantidadTotal * precioActual) });
  }

  return puntos;
}
