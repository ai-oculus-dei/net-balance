import { describe, expect, it } from 'vitest';
import {
  calcularPnL,
  esTipoPorUnidad,
  grupoDePosicion,
  historicoPorPosicion,
  historicoTotalPorDia,
  patrimonioPorGrupo,
  patrimonioTotalActual,
  precioActualTotal,
  precioCompraTotal,
  totalDesdeUnitario,
  unitarioDesdeTotal,
} from '../patrimonio';
import type { PatrimonioHistorico, PosicionPatrimonio, TipoPosicionPatrimonio } from '../../supabase/database.types';

function posicion(overrides: Partial<PosicionPatrimonio> & { id: string; tipo: TipoPosicionPatrimonio }): PosicionPatrimonio {
  return {
    usuario_id: 'u1',
    nombre: overrides.id,
    ticker: null,
    mercado: null,
    cantidad: 1,
    precio_compra_unitario: 0,
    precio_actual_unitario: 0,
    fecha_compra: '2026-01-01',
    activa: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('grupoDePosicion', () => {
  it.each<[TipoPosicionPatrimonio, string]>([
    ['stock', 'renta_variable'],
    ['etf', 'renta_variable'],
    ['fondo_indexado', 'renta_variable'],
    ['commodity', 'renta_variable'],
    ['criptomoneda', 'renta_variable'],
    ['fondo_monetario', 'renta_fija'],
    ['cuenta_remunerada', 'renta_fija'],
    ['cuenta_ahorro', 'renta_fija'],
    ['cuenta_corriente', 'efectivo'],
  ])('%s -> %s', (tipo, grupo) => {
    expect(grupoDePosicion(tipo)).toBe(grupo);
  });
});

describe('esTipoPorUnidad', () => {
  it('true para tipos con cantidad/precio unitario real', () => {
    expect(esTipoPorUnidad('stock')).toBe(true);
    expect(esTipoPorUnidad('criptomoneda')).toBe(true);
  });

  it('false para posiciones de saldo', () => {
    expect(esTipoPorUnidad('cuenta_corriente')).toBe(false);
    expect(esTipoPorUnidad('fondo_monetario')).toBe(false);
  });
});

describe('precioCompraTotal / precioActualTotal', () => {
  it('multiplica cantidad por precio unitario', () => {
    const p = posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_compra_unitario: 15.5, precio_actual_unitario: 20 });
    expect(precioCompraTotal(p)).toBe(155);
    expect(precioActualTotal(p)).toBe(200);
  });
});

describe('calcularPnL', () => {
  it('ganancia: eur y pct positivos', () => {
    const p = posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_compra_unitario: 10, precio_actual_unitario: 12 });
    expect(calcularPnL(p)).toEqual({ eur: 20, pct: 20 });
  });

  it('perdida: eur y pct negativos', () => {
    const p = posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_compra_unitario: 10, precio_actual_unitario: 8 });
    expect(calcularPnL(p)).toEqual({ eur: -20, pct: -20 });
  });

  it('coste de compra 0: pct es null (no divide entre 0)', () => {
    const p = posicion({ id: 'a', tipo: 'cuenta_corriente', cantidad: 1, precio_compra_unitario: 0, precio_actual_unitario: 50 });
    const pnl = calcularPnL(p);
    expect(pnl.eur).toBe(50);
    expect(pnl.pct).toBeNull();
  });
});

describe('patrimonioTotalActual', () => {
  it('suma el valor actual de todas las posiciones', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_actual_unitario: 20 }), // 200
      posicion({ id: 'b', tipo: 'cuenta_corriente', cantidad: 1, precio_actual_unitario: 500 }), // 500
    ];
    expect(patrimonioTotalActual(posiciones)).toBe(700);
  });
});

describe('patrimonioPorGrupo', () => {
  it('agrupa el valor actual en los 3 grupos segun el tipo', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_actual_unitario: 20 }), // 200 RV
      posicion({ id: 'b', tipo: 'criptomoneda', cantidad: 1, precio_actual_unitario: 100 }), // 100 RV
      posicion({ id: 'c', tipo: 'cuenta_ahorro', cantidad: 1, precio_actual_unitario: 300 }), // 300 RF
      posicion({ id: 'd', tipo: 'cuenta_corriente', cantidad: 1, precio_actual_unitario: 50 }), // 50 Efectivo
    ];
    expect(patrimonioPorGrupo(posiciones)).toEqual({ renta_variable: 300, renta_fija: 300, efectivo: 50 });
  });
});

function historico(posicion_id: string, fecha: string, valor_total: number): PatrimonioHistorico {
  return { id: `${posicion_id}-${fecha}`, posicion_id, fecha, valor_total, created_at: fecha };
}

describe('historicoTotalPorDia', () => {
  it('suma el valor de todas las posiciones por fecha, ordenado', () => {
    const puntos = historicoTotalPorDia([
      historico('a', '2026-01-02', 100),
      historico('b', '2026-01-02', 50),
      historico('a', '2026-01-01', 90),
      historico('b', '2026-01-01', 40),
    ]);
    expect(puntos).toEqual([
      { mes: '01 ene', valores: { total: 130 } },
      { mes: '02 ene', valores: { total: 150 } },
    ]);
  });
});

describe('historicoPorPosicion', () => {
  it('limita a maxLineas posiciones, eligiendo las de mayor valor actual', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'stock', nombre: 'A', cantidad: 1, precio_actual_unitario: 100 }),
      posicion({ id: 'b', tipo: 'stock', nombre: 'B', cantidad: 1, precio_actual_unitario: 300 }),
      posicion({ id: 'c', tipo: 'stock', nombre: 'C', cantidad: 1, precio_actual_unitario: 200 }),
    ];
    const hist = [historico('a', '2026-01-01', 100), historico('b', '2026-01-01', 300), historico('c', '2026-01-01', 200)];

    const { lineas, puntos } = historicoPorPosicion(posiciones, hist, 2);

    expect(lineas.map((l) => l.id)).toEqual(['b', 'c']); // mayor valor primero, "a" queda fuera
    expect(puntos).toEqual([{ mes: '01 ene', valores: { b: 300, c: 200 } }]);
  });
});

describe('unitarioDesdeTotal / totalDesdeUnitario', () => {
  it('convierten en ambas direcciones de forma consistente', () => {
    expect(unitarioDesdeTotal(150, 10)).toBe(15);
    expect(totalDesdeUnitario(15, 10)).toBe(150);
  });

  it('unitarioDesdeTotal con cantidad 0 no divide entre 0', () => {
    expect(unitarioDesdeTotal(150, 0)).toBe(0);
  });
});
