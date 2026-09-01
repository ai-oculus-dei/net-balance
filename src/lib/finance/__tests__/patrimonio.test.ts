import { describe, expect, it } from 'vitest';
import {
  calcularPnL,
  esTipoConTae,
  esTipoPorUnidad,
  grupoDePosicion,
  historicoPorPosicion,
  historicoTotalPorDia,
  patrimonioPorGrupo,
  patrimonioTotalActual,
  precioActualTotal,
  precioActualUnitarioEfectivo,
  precioCompraTotal,
  totalDesdeUnitario,
  unitarioDesdeTotal,
  valorConTae,
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
    tae: null,
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

describe('esTipoConTae', () => {
  it('true solo para las posiciones de saldo con rentabilidad conocida', () => {
    expect(esTipoConTae('fondo_monetario')).toBe(true);
    expect(esTipoConTae('cuenta_remunerada')).toBe(true);
    expect(esTipoConTae('cuenta_ahorro')).toBe(true);
  });

  it('false para el resto (incluida Cuenta Corriente)', () => {
    expect(esTipoConTae('cuenta_corriente')).toBe(false);
    expect(esTipoConTae('stock')).toBe(false);
  });
});

describe('valorConTae', () => {
  it('interes simple anualizado: capital * (1 + tae% * dias/365)', () => {
    // 1000€ al 3.65% durante 100 dias -> 1000 * (1 + 0.0365 * 100/365) = 1010
    const hoy = new Date(2026, 0, 101); // dia 101 de enero = 1 de enero + 100 dias
    const valor = valorConTae(1000, 3.65, '2026-01-01', hoy);
    expect(valor).toBeCloseTo(1010, 2);
  });

  it('el mismo dia de compra, sin dias transcurridos, el valor es igual al capital', () => {
    expect(valorConTae(1000, 5, '2026-01-01', new Date(2026, 0, 1))).toBe(1000);
  });

  it('nunca cuenta dias negativos si "hoy" es anterior a la fecha de compra', () => {
    expect(valorConTae(1000, 5, '2026-06-01', new Date(2026, 0, 1))).toBe(1000);
  });
});

describe('precioActualUnitarioEfectivo / precioActualTotal con tae', () => {
  it('con tae, usa el valor calculado en vez del precio actual guardado', () => {
    const p = posicion({
      id: 'a',
      tipo: 'cuenta_remunerada',
      cantidad: 1,
      precio_compra_unitario: 1000,
      precio_actual_unitario: null,
      tae: 3.65,
      fecha_compra: '2026-01-01',
    });
    const hoy = new Date(2026, 0, 101); // +100 dias
    expect(precioActualUnitarioEfectivo(p, hoy)).toBeCloseTo(1010, 2);
    expect(precioActualTotal(p, hoy)).toBeCloseTo(1010, 2);
  });

  it('sin tae, usa el precio actual guardado tal cual', () => {
    const p = posicion({ id: 'a', tipo: 'cuenta_remunerada', cantidad: 1, precio_actual_unitario: 500, tae: null });
    expect(precioActualUnitarioEfectivo(p)).toBe(500);
  });
});

describe('calcularPnL con tae', () => {
  it('el P&L usa el valor calculado por tae como "actual"', () => {
    const p = posicion({
      id: 'a',
      tipo: 'fondo_monetario',
      cantidad: 1,
      precio_compra_unitario: 1000,
      precio_actual_unitario: null,
      tae: 3.65,
      fecha_compra: '2026-01-01',
    });
    const hoy = new Date(2026, 0, 101); // +100 dias
    const pnl = calcularPnL(p, hoy);
    expect(pnl.eur).toBeCloseTo(10, 2);
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
