import { describe, expect, it } from 'vitest';
import { calcularVentaFIFO, retirarDeCuenta } from '../ventas';
import type { PosicionPatrimonio, TipoPosicionPatrimonio } from '../../supabase/database.types';

function posicion(overrides: Partial<PosicionPatrimonio> & { id: string; tipo: TipoPosicionPatrimonio }): PosicionPatrimonio {
  return {
    usuario_id: 'u1',
    nombre: overrides.id,
    ticker: null,
    mercado: null,
    moneda: 'EUR',
    cantidad: 1,
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

describe('calcularVentaFIFO', () => {
  it('vende todo un unico lote y lo archiva', () => {
    const lote = posicion({ id: 'l1', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 20000 });
    const r = calcularVentaFIFO([lote], 1, 30000);
    expect(r.actualizaciones).toEqual([{ id: 'l1', archivar: true }]);
    expect(r.costeBaseTotal).toBe(20000);
    expect(r.importeRecibido).toBe(30000);
    expect(r.gananciaRealizada).toBe(10000);
    expect(r.gananciaRealizadaPct).toBe(50);
  });

  it('vende una parte de un unico lote y reduce la cantidad sin archivar', () => {
    const lote = posicion({ id: 'l1', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 20000 });
    const r = calcularVentaFIFO([lote], 0.4, 30000);
    expect(r.actualizaciones).toEqual([{ id: 'l1', archivar: false, cantidad: 0.6 }]);
    expect(r.costeBaseTotal).toBe(8000);
    expect(r.importeRecibido).toBe(12000);
    expect(r.gananciaRealizada).toBe(4000);
  });

  it('consume primero el lote mas antiguo (FIFO) cuando la venta abarca varios lotes', () => {
    const lote1 = posicion({ id: 'l1', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 20000, fecha_compra: '2026-01-01' });
    const lote2 = posicion({ id: 'l2', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 30000, fecha_compra: '2026-02-01' });
    // El activo agrupado siempre pasa los lotes ya ordenados ascendente por fecha_compra.
    const r = calcularVentaFIFO([lote1, lote2], 1.5, 40000);
    expect(r.actualizaciones).toEqual([
      { id: 'l1', archivar: true },
      { id: 'l2', archivar: false, cantidad: 0.5 },
    ]);
    // Coste base: 1 unidad del lote1 (20000) + 0.5 unidades del lote2 (15000) = 35000
    expect(r.costeBaseTotal).toBe(35000);
    expect(r.importeRecibido).toBe(60000);
    expect(r.gananciaRealizada).toBe(25000);
  });

  it('lanza si la cantidad a vender supera lo disponible', () => {
    const lote = posicion({ id: 'l1', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 20000 });
    expect(() => calcularVentaFIFO([lote], 2, 30000)).toThrow();
  });

  it('gananciaRealizadaPct es null si el coste base es 0', () => {
    const lote = posicion({ id: 'l1', tipo: 'criptomoneda', cantidad: 1, precio_compra_unitario: 0 });
    const r = calcularVentaFIFO([lote], 1, 100);
    expect(r.gananciaRealizadaPct).toBeNull();
  });
});

describe('retirarDeCuenta', () => {
  it('sin TAE: reduce el saldo actual dejando el resto intacto', () => {
    const cuenta = posicion({ id: 'c1', tipo: 'cuenta_ahorro', precio_compra_unitario: 8000, precio_actual_unitario: 8000 });
    const r = retirarDeCuenta(cuenta, 500);
    expect(r).toEqual({ archivar: false, cambios: { precio_actual_unitario: 7500 } });
  });

  it('sin TAE: retirar el saldo completo archiva la cuenta', () => {
    const cuenta = posicion({ id: 'c1', tipo: 'cuenta_ahorro', precio_compra_unitario: 8000, precio_actual_unitario: 8000 });
    const r = retirarDeCuenta(cuenta, 8000);
    expect(r).toEqual({ archivar: true });
  });

  it('con TAE: cristaliza el valor actual efectivo menos el importe como nuevo principal de hoy', () => {
    const cuenta = posicion({
      id: 'c1',
      tipo: 'cuenta_ahorro',
      precio_compra_unitario: 8000,
      precio_actual_unitario: null,
      tae: 3.65, // 0.01%/dia para que sea facil de verificar
      fecha_compra: '2026-01-01',
    });
    const hoy = new Date(2026, 0, 101); // 100 dias despues (JS normaliza el overflow de dia)
    const r = retirarDeCuenta(cuenta, 500, hoy);
    if (r.archivar) throw new Error('no deberia archivar');
    // Valor efectivo a hoy: 8000 * (1 + 0.0365 * 100/365) = 8080; menos 500 = 7580
    expect(r.cambios.precio_compra_unitario).toBe(7580);
    expect(r.cambios.precio_actual_unitario).toBeNull();
    expect(r.cambios.tae).toBe(3.65);
    expect(r.cambios.fecha_compra).toBe('2026-04-11');
  });

  it('lanza si el importe supera el saldo disponible', () => {
    const cuenta = posicion({ id: 'c1', tipo: 'cuenta_ahorro', precio_compra_unitario: 8000, precio_actual_unitario: 8000 });
    expect(() => retirarDeCuenta(cuenta, 8000.5)).toThrow();
  });
});
