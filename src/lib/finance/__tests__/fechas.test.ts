import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rangoDelMes, rangoEntreMeses, rangoUltimosMeses } from '../fechas';

// Sin @types/node en este proyecto (app de navegador): tipado minimo para poder forzar
// la zona horaria del proceso de test sin arrastrar una dependencia nueva.
declare const process: { env: { TZ?: string } };

// Regresion: en una zona por delante de UTC (España), un `toIsoDate` que pasara por
// `toISOString()` corria el limite superior del rango al ultimo dia del mes en curso,
// haciendo que los movimientos de ese ultimo dia se colasen en el mes siguiente.
describe('rangos de fecha (zona horaria España, por delante de UTC)', () => {
  const tzOriginal = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Madrid';
  });

  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  it('rangoDelMes: el limite superior es el dia 1 del mes siguiente', () => {
    const rango = rangoDelMes(new Date(2026, 1, 15)); // 15 de febrero de 2026
    expect(rango.desde).toBe('2026-02-01');
    expect(rango.hasta).toBe('2026-03-01');
  });

  it('rangoUltimosMeses: el limite superior sigue siendo el dia 1 del mes siguiente', () => {
    const rango = rangoUltimosMeses(3, new Date(2026, 1, 15));
    expect(rango.desde).toBe('2025-12-01');
    expect(rango.hasta).toBe('2026-03-01');
  });

  it('rangoEntreMeses: el limite superior es el dia 1 del mes siguiente a "hasta"', () => {
    const rango = rangoEntreMeses('2026-01', '2026-02');
    expect(rango.desde).toBe('2026-01-01');
    expect(rango.hasta).toBe('2026-03-01');
  });
});
