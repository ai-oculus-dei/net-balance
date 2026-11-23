import type { PosicionPatrimonio } from '../supabase/database.types';
import type { ActivoAgrupado } from './patrimonio';
import type { PrecioDiarioActivo } from './historicoPrecioActivo';

// ============================================================
// P/L diario: lo que ha ganado o perdido un activo HOY, respecto al primer precio que se tiene
// del dia (precio de apertura).
//
// La Edge Function guarda una fila por activo y dia en precios_historico_activo; su
// precio_apertura es el precio de la primera actualizacion del dia (ver migracion 0024). Si la
// fila de hoy no lo tiene (filas creadas antes de la 0024), se usa el ultimo precio del dia
// anterior. El "dia" es el de la Edge Function: fecha UTC.
// ============================================================

export interface PnLDiario {
  apertura: number; // precio unitario de apertura (EUR)
  precioActual: number; // precio unitario actual (EUR)
  eur: number; // P/L de hoy de todo el activo
  pct: number; // variacion del precio unitario hoy, en %
}

export function hoyUtcIso(ahora: Date = new Date()): string {
  return ahora.toISOString().slice(0, 10);
}

function clave(ticker: string, mercado: string | null): string {
  return `${ticker.trim().toLowerCase()}|${(mercado ?? '').trim().toLowerCase()}`;
}

// Precio de apertura de hoy de un ticker+mercado, o null si todavia no hay precio de hoy.
export function precioAperturaHoy(
  ticker: string,
  mercado: string | null,
  precios: PrecioDiarioActivo[],
  ahora: Date = new Date()
): number | null {
  const c = clave(ticker, mercado);
  const hoy = hoyUtcIso(ahora);
  let filaHoy: PrecioDiarioActivo | null = null;
  let anterior: PrecioDiarioActivo | null = null;
  for (const p of precios) {
    if (clave(p.ticker, p.mercado) !== c) continue;
    if (p.fecha === hoy) filaHoy = p;
    else if (p.fecha < hoy && (!anterior || p.fecha > anterior.fecha)) anterior = p;
  }
  if (!filaHoy) return null;
  return filaHoy.precioApertura ?? anterior?.precioUnitario ?? null;
}

// P/L diario de un activo agrupado (todas sus compras). null si no tiene ticker o no hay precio
// de hoy todavia.
export function pnlDiarioActivo(
  activo: ActivoAgrupado,
  precios: PrecioDiarioActivo[],
  ahora: Date = new Date()
): PnLDiario | null {
  if (!activo.ticker || activo.cantidadTotal <= 0) return null;
  const apertura = precioAperturaHoy(activo.ticker, activo.mercado, precios, ahora);
  if (apertura === null || apertura <= 0) return null;
  const precioActual = activo.valorActualTotal / activo.cantidadTotal;
  return {
    apertura,
    precioActual,
    eur: Math.round(activo.cantidadTotal * (precioActual - apertura) * 100) / 100,
    pct: Math.round((precioActual / apertura - 1) * 10000) / 100,
  };
}

// P/L de hoy de una compra concreta del activo (misma variacion de precio, su cantidad).
export function pnlDiarioLote(lote: Pick<PosicionPatrimonio, 'cantidad'>, d: PnLDiario): { eur: number; pct: number } {
  return { eur: Math.round(lote.cantidad * (d.precioActual - d.apertura) * 100) / 100, pct: d.pct };
}
