import { describe, expect, it } from 'vitest';
import { cantidadLoteEnFecha, serieHistoricoActivo, type ActivoParaHistorico, type PrecioDiarioActivo, type VentaLote } from '../historicoPrecioActivo';
import type { PosicionPatrimonio, TipoPosicionPatrimonio } from '../../supabase/database.types';

function lote(overrides: Partial<PosicionPatrimonio> & { id: string; tipo: TipoPosicionPatrimonio }): PosicionPatrimonio {
  return {
    usuario_id: 'u1',
    nombre: overrides.id,
    ticker: 'aapl',
    mercado: null,
    moneda: 'EUR',
    cantidad: 1,
    cantidad_original: 1,
    precio_compra_unitario: 0,
    precio_actual_unitario: 0,
    tae: null,
    error_precio: null,
    fecha_compra: '2026-01-01',
    activa: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('cantidadLoteEnFecha', () => {
  const l = lote({ id: 'l1', tipo: 'stock', cantidad_original: 10, fecha_compra: '2026-01-10' });

  it('es 0 antes de la fecha de compra', () => {
    expect(cantidadLoteEnFecha(l, [], '2026-01-09')).toBe(0);
  });

  it('es la cantidad original si no se ha vendido nada', () => {
    expect(cantidadLoteEnFecha(l, [], '2026-01-10')).toBe(10);
    expect(cantidadLoteEnFecha(l, [], '2026-06-01')).toBe(10);
  });

  it('resta lo vendido con fecha igual o anterior a la consultada', () => {
    const ventas: VentaLote[] = [{ posicionId: 'l1', fecha: '2026-02-01', cantidadConsumida: 4 }];
    expect(cantidadLoteEnFecha(l, ventas, '2026-01-15')).toBe(10); // antes de la venta
    expect(cantidadLoteEnFecha(l, ventas, '2026-02-01')).toBe(6); // el mismo dia de la venta
    expect(cantidadLoteEnFecha(l, ventas, '2026-03-01')).toBe(6); // despues
  });

  it('acumula varias ventas del mismo lote', () => {
    const ventas: VentaLote[] = [
      { posicionId: 'l1', fecha: '2026-02-01', cantidadConsumida: 4 },
      { posicionId: 'l1', fecha: '2026-03-01', cantidadConsumida: 3 },
    ];
    expect(cantidadLoteEnFecha(l, ventas, '2026-02-15')).toBe(6);
    expect(cantidadLoteEnFecha(l, ventas, '2026-03-15')).toBe(3);
  });
});

describe('serieHistoricoActivo', () => {
  function precio(fecha: string, precioUnitario: number): PrecioDiarioActivo {
    return { ticker: 'aapl', mercado: '', fecha, precioUnitario };
  }

  it('vacio si el activo no tiene ticker', () => {
    const activo: ActivoParaHistorico = { ticker: null, mercado: null, lotes: [lote({ id: 'l1', tipo: 'stock' })] };
    expect(serieHistoricoActivo(activo, [], [precio('2026-01-01', 100)])).toEqual([]);
  });

  it('vacio si no hay ningun precio guardado para ese ticker', () => {
    const activo: ActivoParaHistorico = { ticker: 'aapl', mercado: null, lotes: [lote({ id: 'l1', tipo: 'stock' })] };
    expect(serieHistoricoActivo(activo, [], [])).toEqual([]);
  });

  it('calcula valorTotal = cantidad x precio cada dia, rellenando hacia delante los dias sin cotizacion', () => {
    const l1 = lote({ id: 'l1', tipo: 'stock', cantidad_original: 2, fecha_compra: '2026-01-01' });
    const activo: ActivoParaHistorico = { ticker: 'aapl', mercado: null, lotes: [l1] };
    const precios = [precio('2026-01-01', 100), precio('2026-01-03', 110)]; // 01-02 sin cotizacion (findes)
    const hoy = new Date(2026, 0, 3);
    const serie = serieHistoricoActivo(activo, [], precios, hoy);
    expect(serie).toEqual([
      { fecha: '2026-01-01', precioUnitario: 100, cantidadTotal: 2, valorTotal: 200 },
      { fecha: '2026-01-02', precioUnitario: 100, cantidadTotal: 2, valorTotal: 200 }, // relleno hacia delante
      { fecha: '2026-01-03', precioUnitario: 110, cantidadTotal: 2, valorTotal: 220 },
    ]);
  });

  it('refleja una venta parcial exactamente desde su fecha, no antes', () => {
    const l1 = lote({ id: 'l1', tipo: 'stock', cantidad_original: 10, fecha_compra: '2026-01-01' });
    const activo: ActivoParaHistorico = { ticker: 'aapl', mercado: null, lotes: [l1] };
    const precios = [precio('2026-01-01', 100), precio('2026-01-02', 100), precio('2026-01-03', 100)];
    const ventas: VentaLote[] = [{ posicionId: 'l1', fecha: '2026-01-02', cantidadConsumida: 4 }];
    const hoy = new Date(2026, 0, 3);
    const serie = serieHistoricoActivo(activo, ventas, precios, hoy);
    expect(serie.map((p) => p.cantidadTotal)).toEqual([10, 6, 6]);
  });

  it('suma varios lotes del mismo activo, cada uno desde su propia fecha de compra', () => {
    const l1 = lote({ id: 'l1', tipo: 'stock', cantidad_original: 1, fecha_compra: '2026-01-01' });
    const l2 = lote({ id: 'l2', tipo: 'stock', cantidad_original: 1, fecha_compra: '2026-01-02' });
    const activo: ActivoParaHistorico = { ticker: 'aapl', mercado: null, lotes: [l1, l2] };
    const precios = [precio('2026-01-01', 100), precio('2026-01-02', 100)];
    const hoy = new Date(2026, 0, 2);
    const serie = serieHistoricoActivo(activo, [], precios, hoy);
    expect(serie.map((p) => p.cantidadTotal)).toEqual([1, 2]);
  });
});
