import { describe, expect, it } from 'vitest';
import {
  CLAVE_BLOQUE_INDEXADOS_RV,
  CLAVE_BLOQUE_LIQUIDEZ,
  claveUnidad,
  desviacionesCartera,
  estadoObjetivo,
  margenObjetivo,
  objetivoEfectivoPct,
  parsearEuros,
  parsearPorcentaje,
  pesoPorEtiqueta,
  unidadesCartera,
  valorFondoEmergencia,
} from '../objetivosCartera';
import type { PosicionPatrimonio, TipoPosicionPatrimonio } from '../../supabase/database.types';

function posicion(o: Partial<PosicionPatrimonio> & { id: string; tipo: TipoPosicionPatrimonio; valor: number }): PosicionPatrimonio {
  const { valor, ...resto } = o;
  return {
    usuario_id: 'u1',
    nombre: o.id,
    ticker: null,
    mercado: null,
    moneda: 'EUR',
    cantidad: 1,
    cantidad_original: 1,
    precio_compra_unitario: valor,
    precio_actual_unitario: valor,
    tae: null,
    error_precio: null,
    fecha_compra: '2026-01-01',
    activa: true,
    created_at: '',
    updated_at: '',
    ...resto,
  };
}

describe('claveUnidad', () => {
  it('agrupa la liquidez en un bloque (Fondo de Emergencia), y los indexados RV en otro', () => {
    for (const tipo of ['cuenta_corriente', 'cuenta_remunerada', 'cuenta_ahorro', 'fondo_monetario'] as const) {
      expect(claveUnidad({ tipo, ticker: null, mercado: null, nombre: 'x' })).toBe(CLAVE_BLOQUE_LIQUIDEZ);
    }
    expect(claveUnidad({ tipo: 'fondo_indexado_rv', ticker: 'IWDA', mercado: null, nombre: 'x' })).toBe(CLAVE_BLOQUE_INDEXADOS_RV);
  });

  it('cada stock, ETF, fondo indexado RF, cripto o commodity va por separado', () => {
    expect(claveUnidad({ tipo: 'stock', ticker: 'AAPL', mercado: 'NASDAQ', nombre: 'Apple' })).toBe('activo:aapl|nasdaq');
    expect(claveUnidad({ tipo: 'fondo_indexado_rf', ticker: 'IE00B1', mercado: null, nombre: 'Bonos' })).toBe('activo:ie00b1|');
    expect(claveUnidad({ tipo: 'etf', ticker: 'VWCE.DE', mercado: null, nombre: 'V' })).not.toBe(
      claveUnidad({ tipo: 'etf', ticker: 'SXR8.DE', mercado: null, nombre: 'S' })
    );
  });
});

describe('unidadesCartera', () => {
  it('deja fuera el Fondo de Emergencia y calcula el peso sobre el resto, de mayor a menor', () => {
    const posiciones = [
      posicion({ id: 'c1', tipo: 'cuenta_corriente', valor: 1000 }),
      posicion({ id: 'c2', tipo: 'cuenta_remunerada', valor: 1000 }),
      posicion({ id: 'f1', tipo: 'fondo_indexado_rv', valor: 6000 }),
      posicion({ id: 's1', tipo: 'stock', ticker: 'SPCX', valor: 2000 }),
    ];
    const unidades = unidadesCartera(posiciones);
    expect(unidades.map((u) => [u.clave, u.valor, u.pct, u.numActivos])).toEqual([
      [CLAVE_BLOQUE_INDEXADOS_RV, 6000, 75, 1],
      ['activo:spcx|', 2000, 25, 1],
    ]);
    expect(valorFondoEmergencia(posiciones)).toBe(2000);
  });

  it('las compras de un mismo stock son una sola unidad', () => {
    const unidades = unidadesCartera([
      posicion({ id: 'a', tipo: 'stock', ticker: 'AAPL', valor: 100 }),
      posicion({ id: 'b', tipo: 'stock', ticker: 'AAPL', valor: 300 }),
    ]);
    expect(unidades).toHaveLength(1);
    expect(unidades[0].valor).toBe(400);
    expect(unidades[0].pct).toBe(100);
  });
});

describe('margen y estado', () => {
  it('margen = el menor entre 5 puntos y el 40 % del objetivo', () => {
    expect(margenObjetivo(5)).toBe(2);
    expect(margenObjetivo(10)).toBe(4);
    expect(margenObjetivo(12.5)).toBe(5);
    expect(margenObjetivo(70)).toBe(5);
    expect(margenObjetivo(0)).toBe(0);
  });

  it('ejemplos: 5 % avisa por debajo de 3 o por encima de 7; 70 % fuera de 65-75', () => {
    expect(estadoObjetivo(3, 5)).toBe('en_rango');
    expect(estadoObjetivo(2.9, 5)).toBe('por_debajo');
    expect(estadoObjetivo(7, 5)).toBe('en_rango');
    expect(estadoObjetivo(7.1, 5)).toBe('por_encima');
    expect(estadoObjetivo(64.9, 70)).toBe('por_debajo');
    expect(estadoObjetivo(75.1, 70)).toBe('por_encima');
    expect(estadoObjetivo(70, 70)).toBe('en_rango');
  });
});

describe('desviacionesCartera', () => {
  const unidades = unidadesCartera([
    posicion({ id: 'f1', tipo: 'fondo_indexado_rv', valor: 8000 }),
    posicion({ id: 's1', tipo: 'stock', ticker: 'SPCX', valor: 1000 }),
    posicion({ id: 'c1', tipo: 'cuenta_corriente', valor: 1000 }),
  ]);

  it('solo devuelve las unidades con objetivo fuera de margen, las mas desviadas primero', () => {
    const d = desviacionesCartera(unidades, [
      { clave: CLAVE_BLOQUE_INDEXADOS_RV, etiqueta: 'nucleo', objetivoPct: 70, objetivoEur: null }, // 80 > 75
      { clave: 'activo:spcx|', etiqueta: 'satelite', objetivoPct: 5, objetivoEur: null }, // 10 > 7
      { clave: CLAVE_BLOQUE_LIQUIDEZ, etiqueta: null, objetivoPct: 50, objetivoEur: null }, // Fondo de Emergencia: va aparte
      { clave: 'activo:otro', etiqueta: 'satelite', objetivoPct: null, objetivoEur: null }, // sin objetivo
    ]);
    expect(d.map((x) => [x.clave, x.estado])).toEqual([
      [CLAVE_BLOQUE_INDEXADOS_RV, 'por_encima'],
      ['activo:spcx|', 'por_encima'],
    ]);
  });

  it('un bloque con objetivo pero sin nada dentro cuenta como 0 %', () => {
    const sinIndexados = unidadesCartera([posicion({ id: 's1', tipo: 'stock', ticker: 'X', valor: 100 })]);
    const d = desviacionesCartera(sinIndexados, [{ clave: CLAVE_BLOQUE_INDEXADOS_RV, etiqueta: null, objetivoPct: 20, objetivoEur: null }]);
    expect(d).toEqual([
      { clave: CLAVE_BLOQUE_INDEXADOS_RV, nombre: 'Fondos indexados RV', pct: 0, objetivoPct: 20, margen: 5, estado: 'por_debajo' },
    ]);
  });

  it('suma el peso de nucleo y satelite', () => {
    expect(
      pesoPorEtiqueta(unidades, [
        { clave: CLAVE_BLOQUE_INDEXADOS_RV, etiqueta: 'nucleo', objetivoPct: null, objetivoEur: null },
        { clave: 'activo:spcx|', etiqueta: 'satelite', objetivoPct: null, objetivoEur: null },
      ])
    ).toEqual({ nucleo: 88.89, satelite: 11.11 });
  });
});

describe('parsearPorcentaje', () => {
  it('acepta coma o punto y valida el rango', () => {
    expect(parsearPorcentaje('5,5')).toBe(5.5);
    expect(parsearPorcentaje(' 70 % ')).toBe(70);
    expect(parsearPorcentaje('')).toBeNull();
    expect(parsearPorcentaje('120')).toBeNaN();
    expect(parsearPorcentaje('abc')).toBeNaN();
  });
});

describe('objetivo en euros (dinamico)', () => {
  it('se convierte en % sobre el patrimonio total, como mucho 100', () => {
    expect(objetivoEfectivoPct({ objetivoPct: null, objetivoEur: 6000 }, 60000)).toBe(10);
    expect(objetivoEfectivoPct({ objetivoPct: null, objetivoEur: 90000 }, 60000)).toBe(100);
    expect(objetivoEfectivoPct({ objetivoPct: 25, objetivoEur: null }, 60000)).toBe(25);
    expect(objetivoEfectivoPct({ objetivoPct: null, objetivoEur: 6000 }, 0)).toBeNull();
  });

  it('el aviso usa el % equivalente: 6.000 € de 10.000 € es un 60 %', () => {
    const unidades = unidadesCartera([
      posicion({ id: 's1', tipo: 'stock', ticker: 'X', valor: 2000 }),
      posicion({ id: 'f1', tipo: 'fondo_indexado_rv', valor: 8000 }),
      posicion({ id: 'c1', tipo: 'cuenta_corriente', valor: 5000 }), // Fondo de Emergencia: no cuenta en la base
    ]);
    const d = desviacionesCartera(unidades, [{ clave: 'activo:x|', etiqueta: null, objetivoPct: null, objetivoEur: 6000 }]);
    expect(d).toEqual([{ clave: 'activo:x|', nombre: 's1', pct: 20, objetivoPct: 60, margen: 5, estado: 'por_debajo' }]);
  });

  it('parsearEuros acepta puntos de miles y coma decimal', () => {
    expect(parsearEuros('6000')).toBe(6000);
    expect(parsearEuros('6.000')).toBe(6000);
    expect(parsearEuros('6.000,50 €')).toBe(6000.5);
    expect(parsearEuros('1.5')).toBe(1.5);
    expect(parsearEuros('')).toBeNull();
    expect(parsearEuros('-3')).toBeNaN();
    expect(parsearEuros('abc')).toBeNaN();
  });
});
