import { describe, expect, it } from 'vitest';
import { fechaInicioRango, filtrarPorRango, formatoEjeRango, ticksEje, timestampDia } from '../rangosTemporales';

const hoy = new Date(2026, 10, 19, 15, 30); // 19 nov 2026

describe('fechaInicioRango', () => {
  it('cuenta hacia atras desde hoy', () => {
    expect(fechaInicioRango('1W', hoy)).toBe('2026-11-12');
    expect(fechaInicioRango('YTD', hoy)).toBe('2026-01-01');
    expect(fechaInicioRango('ALL', hoy) < '1900-01-01').toBe(true);
    expect(fechaInicioRango('1M', hoy)).toBe('2026-10-19');
    expect(fechaInicioRango('6M', hoy)).toBe('2026-05-19');
    expect(fechaInicioRango('1Y', hoy)).toBe('2025-11-19');
    expect(fechaInicioRango('5Y', hoy)).toBe('2021-11-19');
  });

  it('cruza el cambio de año', () => {
    expect(fechaInicioRango('1M', new Date(2026, 0, 10))).toBe('2025-12-10');
  });
});

describe('filtrarPorRango', () => {
  it('se queda con los puntos desde el inicio del rango (inclusive)', () => {
    const puntos = [{ fecha: '2026-11-11' }, { fecha: '2026-11-12' }, { fecha: '2026-11-19' }];
    expect(filtrarPorRango(puntos, '1W', hoy)).toEqual([{ fecha: '2026-11-12' }, { fecha: '2026-11-19' }]);
  });
});

describe('eje temporal', () => {
  it('timestampDia usa la medianoche local', () => {
    expect(timestampDia('2026-11-19')).toBe(new Date(2026, 10, 19).getTime());
  });

  it('formatea segun el rango', () => {
    const t = timestampDia('2026-11-19');
    expect(formatoEjeRango('5Y')(t)).toBe('2026');
    expect(formatoEjeRango('1Y')(t)).toMatch(/^nov 26$/);
    expect(formatoEjeRango('1W')(t)).toMatch(/^19 nov$/);
  });

  it('en rangos cortos reparte las marcas en dias exactos y dentro del rango', () => {
    const min = timestampDia('2026-11-01');
    const max = timestampDia('2026-11-30');
    const ticks = ticksEje(min, max, '1M', 5);
    expect(ticks.length).toBe(5);
    expect(ticks[0]).toBe(min);
    expect(ticks[ticks.length - 1]).toBe(max);
    for (const t of ticks) expect(new Date(t).getHours()).toBe(0);
  });

  it('en 5Y pone una marca el 1 de enero de cada año (sin años repetidos)', () => {
    const ticks = ticksEje(timestampDia('2024-09-15'), timestampDia('2026-11-19'), '5Y', 5);
    expect(ticks).toEqual([timestampDia('2025-01-01'), timestampDia('2026-01-01')]);
  });

  it('en 6M/1Y pone las marcas el dia 1 de cada mes, aclaradas hasta el maximo', () => {
    const ticks = ticksEje(timestampDia('2026-05-19'), timestampDia('2026-11-19'), '6M', 4);
    expect(ticks).toEqual([timestampDia('2026-06-01'), timestampDia('2026-08-01'), timestampDia('2026-10-01')]);
  });

  it('con un solo dia devuelve una sola marca', () => {
    const t = timestampDia('2026-11-19');
    expect(ticksEje(t, t, '1W')).toEqual([t]);
  });

  it('en YTD y ALL la escala depende de lo que cubren los datos', () => {
    const t = timestampDia('2026-11-19');
    expect(formatoEjeRango('ALL', timestampDia('2023-01-01'), t)(t)).toBe('2026');
    expect(formatoEjeRango('YTD', timestampDia('2026-01-01'), t)(t)).toMatch(/^nov 26$/);
    expect(formatoEjeRango('YTD', timestampDia('2026-01-01'), timestampDia('2026-01-20'))(t)).toMatch(/^19 nov$/);
    expect(ticksEje(timestampDia('2026-01-01'), t, 'YTD', 4)).toEqual([
      timestampDia('2026-01-01'),
      timestampDia('2026-04-01'),
      timestampDia('2026-07-01'),
      timestampDia('2026-10-01'),
    ]);
  });
});
