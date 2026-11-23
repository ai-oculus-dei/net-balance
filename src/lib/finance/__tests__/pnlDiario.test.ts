import { describe, expect, it } from 'vitest';
import { pnlDiarioActivo, pnlDiarioLote, precioAperturaHoy } from '../pnlDiario';
import type { ActivoAgrupado } from '../patrimonio';
import type { PrecioDiarioActivo } from '../historicoPrecioActivo';

const AHORA = new Date('2026-11-23T12:00:00Z');

function activo(o: Partial<ActivoAgrupado>): ActivoAgrupado {
  return {
    id: 'a',
    tipo: 'stock',
    nombre: 'Airbus',
    ticker: 'AIR.PA',
    mercado: null,
    lotes: [],
    cantidadTotal: 10,
    precioCompraMedio: 100,
    valorActualTotal: 1100, // 110 €/ud
    pnl: { eur: 100, pct: 10 },
    ...o,
  };
}

const precio = (fecha: string, precioUnitario: number, precioApertura: number | null = null): PrecioDiarioActivo => ({
  ticker: 'air.pa',
  mercado: '',
  fecha,
  precioUnitario,
  precioApertura,
});

describe('precioAperturaHoy', () => {
  it('usa el precio de apertura guardado en la fila de hoy', () => {
    expect(precioAperturaHoy('AIR.PA', null, [precio('2026-11-22', 99), precio('2026-11-23', 110, 100)], AHORA)).toBe(100);
  });

  it('sin apertura guardada, usa el ultimo precio del dia anterior', () => {
    expect(precioAperturaHoy('AIR.PA', null, [precio('2026-11-20', 90), precio('2026-11-21', 98), precio('2026-11-23', 110)], AHORA)).toBe(98);
  });

  it('null si todavia no hay precio de hoy', () => {
    expect(precioAperturaHoy('AIR.PA', null, [precio('2026-11-22', 99, 97)], AHORA)).toBeNull();
  });
});

describe('pnlDiarioActivo', () => {
  it('cantidad x (precio actual - apertura) y % de variacion del precio', () => {
    const d = pnlDiarioActivo(activo({}), [precio('2026-11-23', 110, 100)], AHORA);
    expect(d).toEqual({ apertura: 100, precioActual: 110, eur: 100, pct: 10 });
    expect(pnlDiarioLote({ cantidad: 4 }, d!)).toEqual({ eur: 40, pct: 10 });
  });

  it('null en activos sin ticker', () => {
    expect(pnlDiarioActivo(activo({ ticker: null }), [precio('2026-11-23', 110, 100)], AHORA)).toBeNull();
  });
});
