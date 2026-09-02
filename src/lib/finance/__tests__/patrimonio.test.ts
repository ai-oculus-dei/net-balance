import { describe, expect, it } from 'vitest';
import {
  agruparPorActivo,
  calcularPnL,
  claveActivo,
  claveCuenta,
  crecimientoDesdeInicioAnio,
  esTipoConTae,
  esTipoPorUnidad,
  grupoDePosicion,
  historicoPorActivo,
  historicoTotalPorDia,
  patrimonioPorGrupo,
  patrimonioPorTipo,
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

describe('patrimonioPorTipo', () => {
  it('agrupa por tipo exacto, suma varias posiciones del mismo tipo, y ordena de mayor a menor', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'stock', cantidad: 10, precio_actual_unitario: 20 }), // 200
      posicion({ id: 'b', tipo: 'criptomoneda', cantidad: 1, precio_actual_unitario: 500 }), // 500
      posicion({ id: 'c', tipo: 'stock', cantidad: 5, precio_actual_unitario: 20 }), // 100 (mismo tipo que a)
    ];
    expect(patrimonioPorTipo(posiciones)).toEqual([
      { tipo: 'criptomoneda', valor: 500 },
      { tipo: 'stock', valor: 300 },
    ]);
  });

  it('excluye tipos con valor 0', () => {
    const posiciones = [posicion({ id: 'a', tipo: 'stock', cantidad: 1, precio_actual_unitario: 0 })];
    expect(patrimonioPorTipo(posiciones)).toEqual([]);
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

describe('crecimientoDesdeInicioAnio', () => {
  const hoy = new Date(2026, 8, 2); // 2 de septiembre de 2026

  it('compara el total actual con el snapshot exacto del 1 de enero de este año', () => {
    const hist = [historico('a', '2026-01-01', 900), historico('b', '2026-01-01', 100)];
    const crecimiento = crecimientoDesdeInicioAnio(hist, 1300, hoy);
    expect(crecimiento).toEqual({ eur: 300, pct: 30 });
  });

  it('si nada existia a 1 de enero, el total de partida es 0 y el % es null', () => {
    const hist = [historico('a', '2026-06-01', 500)]; // posicion comprada despues de enero
    const crecimiento = crecimientoDesdeInicioAnio(hist, 800, hoy);
    expect(crecimiento).toEqual({ eur: 800, pct: null });
  });

  it('ignora snapshots de 1 de enero de otros años', () => {
    const hist = [historico('a', '2025-01-01', 5000)];
    const crecimiento = crecimientoDesdeInicioAnio(hist, 100, hoy);
    expect(crecimiento).toEqual({ eur: 100, pct: null });
  });
});

describe('claveActivo', () => {
  it('null sin ticker (posiciones de saldo no se agrupan)', () => {
    expect(claveActivo(null, null)).toBeNull();
    expect(claveActivo('', 'XETR')).toBeNull();
  });

  it('misma clave para el mismo ticker+mercado, sin distinguir mayusculas ni espacios', () => {
    expect(claveActivo('NUKL', 'XETR')).toBe(claveActivo(' nukl ', ' xetr '));
  });

  it('distinta clave si cambia el mercado', () => {
    expect(claveActivo('AF', 'Euronext')).not.toBe(claveActivo('AF', 'SET'));
  });
});

describe('claveCuenta', () => {
  it('misma clave para el mismo tipo+nombre, sin distinguir mayusculas ni espacios', () => {
    expect(claveCuenta('cuenta_remunerada', 'Sabadell')).toBe(claveCuenta('cuenta_remunerada', ' sabadell '));
  });

  it('distinta clave si cambia el tipo, aunque el nombre coincida', () => {
    expect(claveCuenta('cuenta_remunerada', 'Principal')).not.toBe(claveCuenta('cuenta_corriente', 'Principal'));
  });
});

describe('agruparPorActivo', () => {
  it('agrupa compras distintas del mismo ticker+mercado en un solo activo', () => {
    const posiciones = [
      posicion({
        id: 'lote1',
        tipo: 'etf',
        nombre: 'VanEck Uranium and Nuclear',
        ticker: 'NUKL',
        mercado: 'XETR',
        cantidad: 3,
        precio_compra_unitario: 50,
        precio_actual_unitario: 55,
        fecha_compra: '2026-01-23',
      }),
      posicion({
        id: 'lote2',
        tipo: 'etf',
        nombre: 'NUKL (otro nombre, se ignora)',
        ticker: 'nukl',
        mercado: 'xetr',
        cantidad: 3,
        precio_compra_unitario: 48,
        precio_actual_unitario: 55,
        fecha_compra: '2026-06-05',
      }),
    ];

    const [activo] = agruparPorActivo(posiciones);

    expect(activo.id).toBe('lote1'); // primera compra por fecha
    expect(activo.nombre).toBe('VanEck Uranium and Nuclear'); // hereda el nombre de la primera compra
    expect(activo.lotes.map((l) => l.id)).toEqual(['lote1', 'lote2']); // ordenados por fecha
    expect(activo.cantidadTotal).toBe(6);
    expect(activo.precioCompraMedio).toBe(49); // (3*50 + 3*48) / 6
    expect(activo.valorActualTotal).toBe(330); // 6 * 55
    expect(activo.pnl.eur).toBe(36); // 330 - (150+144)
    expect(activo.pnl.pct).toBe(12.24); // 36 / 294 * 100
  });

  it('agrupa aportaciones sin ticker por tipo+nombre (misma cuenta)', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'cuenta_remunerada', nombre: 'Sabadell', ticker: null, cantidad: 1, precio_compra_unitario: 1000, precio_actual_unitario: 1000, fecha_compra: '2026-01-01' }),
      posicion({ id: 'b', tipo: 'cuenta_remunerada', nombre: 'sabadell', ticker: null, cantidad: 1, precio_compra_unitario: 500, precio_actual_unitario: 500, fecha_compra: '2026-06-01' }),
    ];
    const [activo] = agruparPorActivo(posiciones);
    expect(activo.lotes.map((l) => l.id)).toEqual(['a', 'b']);
    expect(activo.valorActualTotal).toBe(1500); // la aportacion nueva se suma a la existente
  });

  it('no agrupa cuentas sin ticker con distinto nombre o distinto tipo', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'cuenta_corriente', nombre: 'Principal', ticker: null, cantidad: 1, precio_actual_unitario: 100 }),
      posicion({ id: 'b', tipo: 'cuenta_corriente', nombre: 'Otra', ticker: null, cantidad: 1, precio_actual_unitario: 200 }),
      posicion({ id: 'c', tipo: 'cuenta_ahorro', nombre: 'Principal', ticker: null, cantidad: 1, precio_actual_unitario: 300 }),
    ];
    expect(agruparPorActivo(posiciones)).toHaveLength(3);
  });
});

describe('historicoPorActivo', () => {
  it('suma el historico de los lotes de un mismo activo en una sola linea', () => {
    const posiciones = [
      posicion({ id: 'lote1', tipo: 'etf', nombre: 'NUKL', ticker: 'NUKL', mercado: 'XETR', cantidad: 3, precio_actual_unitario: 50, fecha_compra: '2026-01-23' }),
      posicion({ id: 'lote2', tipo: 'etf', nombre: 'NUKL', ticker: 'NUKL', mercado: 'XETR', cantidad: 3, precio_actual_unitario: 50, fecha_compra: '2026-06-05' }),
    ];
    const hist = [historico('lote1', '2026-01-01', 100), historico('lote2', '2026-01-01', 80)];

    const { lineas, puntos } = historicoPorActivo(posiciones, hist, 8);

    expect(lineas).toEqual([{ id: 'lote1', colorIndex: 0, etiqueta: 'NUKL' }]);
    expect(puntos).toEqual([{ mes: '01 ene', valores: { lote1: 180 } }]);
  });

  it('limita a maxLineas activos, eligiendo los de mayor valor actual', () => {
    const posiciones = [
      posicion({ id: 'a', tipo: 'stock', nombre: 'A', cantidad: 1, precio_actual_unitario: 100 }),
      posicion({ id: 'b', tipo: 'stock', nombre: 'B', cantidad: 1, precio_actual_unitario: 300 }),
      posicion({ id: 'c', tipo: 'stock', nombre: 'C', cantidad: 1, precio_actual_unitario: 200 }),
    ];
    const hist = [historico('a', '2026-01-01', 100), historico('b', '2026-01-01', 300), historico('c', '2026-01-01', 200)];

    const { lineas, puntos } = historicoPorActivo(posiciones, hist, 2);

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
