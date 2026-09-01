import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  periodosEntre,
  resolverPeriodoActual,
  resolverRangoEntreMeses,
  resolverRangoMes,
  type AnclaPeriodo,
} from '../periodos';

declare const process: { env: { TZ?: string } };

// Ejemplo real usado para validar el diseño con el usuario: nomina marcada el 26 de agosto de
// 2025 a mediodia (etiqueta "Septiembre") y la siguiente el 28 de septiembre de 2025 (etiqueta
// "Octubre").
const ancla26Ago: AnclaPeriodo = { fecha: '2025-08-26T12:00:00.000Z' };
const ancla28Sep: AnclaPeriodo = { fecha: '2025-09-28T12:00:00.000Z' };

describe('periodos de pago (zona horaria España, por delante de UTC)', () => {
  const tzOriginal = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Madrid';
  });

  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  describe('resolverRangoMes', () => {
    it('sin anclas, cae al mes de calendario normal (medianoche local exacta)', () => {
      const rango = resolverRangoMes([], new Date(2025, 8, 15)); // 15 sept 2025
      expect(new Date(rango.desde).getTime()).toBe(new Date(2025, 8, 1).getTime());
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 9, 1).getTime());
    });

    it('con ancla de inicio, el limite inferior es el instante exacto marcado (no medianoche)', () => {
      const rango = resolverRangoMes([ancla26Ago], new Date(2025, 8, 1)); // etiqueta "Septiembre"
      expect(rango.desde).toBe('2025-08-26T12:00:00.000Z');
    });

    it('sin ancla del mes siguiente, el cierre es el mes de calendario normal (dia 1 del mes siguiente)', () => {
      const rango = resolverRangoMes([ancla26Ago], new Date(2025, 8, 1)); // "Septiembre", sin ancla en octubre
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 9, 1).getTime());
    });

    it('caso completo del usuario: dos anclas consecutivas', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 8, 1)); // "Septiembre"
      expect(rango).toEqual({ desde: '2025-08-26T12:00:00.000Z', hasta: '2025-09-28T12:00:00.000Z' });
    });

    it('el mes que marca la ancla siguiente empieza justo en ese instante', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 9, 1)); // "Octubre"
      expect(rango.desde).toBe('2025-09-28T12:00:00.000Z');
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 10, 1).getTime());
    });

    it('un mes sin marcar entre dos anclas se queda con sus limites de calendario normales, sin que el vecino se lo trague', () => {
      // Nomina de agosto marcada el 26 de julio ("Agosto"), pero septiembre nunca se marca.
      const ancla26Jul: AnclaPeriodo = { fecha: '2025-07-26T09:00:00.000Z' };
      const rangoAgosto = resolverRangoMes([ancla26Jul], new Date(2025, 7, 1)); // "Agosto"
      // Como no hay ancla en septiembre, Agosto cierra su mes de calendario normal (1 sept), no
      // se extiende indefinidamente.
      expect(rangoAgosto.desde).toBe('2025-07-26T09:00:00.000Z');
      expect(new Date(rangoAgosto.hasta).getTime()).toBe(new Date(2025, 8, 1).getTime());

      const rangoSeptiembre = resolverRangoMes([ancla26Jul], new Date(2025, 8, 1)); // "Septiembre"
      expect(new Date(rangoSeptiembre.desde).getTime()).toBe(new Date(2025, 8, 1).getTime());
      expect(new Date(rangoSeptiembre.hasta).getTime()).toBe(new Date(2025, 9, 1).getTime());
    });

    it('con dos anclas para el mismo mes (marcado por error dos veces), usa la mas antigua', () => {
      const anclaTemprana: AnclaPeriodo = { fecha: '2025-08-05T08:00:00.000Z' };
      const anclaTardia: AnclaPeriodo = { fecha: '2025-08-20T08:00:00.000Z' };
      const rango = resolverRangoMes([anclaTardia, anclaTemprana], new Date(2025, 8, 1)); // "Septiembre"
      expect(rango.desde).toBe('2025-08-05T08:00:00.000Z');
    });
  });

  describe('resolverPeriodoActual', () => {
    it('sin anclas, resuelve al mes de calendario de hoy', () => {
      const { rango, etiqueta } = resolverPeriodoActual([], new Date(2025, 8, 15));
      expect(etiqueta).toEqual({ year: 2025, month: 8 });
      expect(new Date(rango.desde).getTime()).toBe(new Date(2025, 8, 1).getTime());
    });

    it('un instante justo antes de la nomina sigue perteneciendo al periodo anterior', () => {
      const justoAntes = new Date('2025-09-28T11:59:59.999Z');
      const { rango, etiqueta } = resolverPeriodoActual([ancla26Ago, ancla28Sep], justoAntes);
      expect(etiqueta).toEqual({ year: 2025, month: 8 }); // "Septiembre"
      expect(rango.hasta).toBe('2025-09-28T12:00:00.000Z');
    });

    it('el instante exacto de la nomina ya pertenece al periodo que empieza', () => {
      const { etiqueta, rango } = resolverPeriodoActual([ancla26Ago, ancla28Sep], new Date('2025-09-28T12:00:00.000Z'));
      expect(etiqueta).toEqual({ year: 2025, month: 9 }); // "Octubre"
      expect(rango.desde).toBe('2025-09-28T12:00:00.000Z');
    });

    it('caso critico: "hoy" en calendario-septiembre pero ya dentro del periodo "Octubre"', () => {
      // Hoy calendario = 29 de septiembre, pero la nomina del 28 de septiembre ya empezo
      // "Octubre" — debe devolver el periodo real (Octubre), no el mes de calendario de hoy.
      const { etiqueta, rango } = resolverPeriodoActual([ancla26Ago, ancla28Sep], new Date(2025, 8, 29));
      expect(etiqueta).toEqual({ year: 2025, month: 9 });
      expect(rango.desde).toBe('2025-09-28T12:00:00.000Z');
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 10, 1).getTime());
    });
  });

  describe('resolverRangoEntreMeses', () => {
    it('resuelve cada extremo con las anclas del usuario', () => {
      const rango = resolverRangoEntreMeses([ancla26Ago, ancla28Sep], '2025-09', '2025-10');
      expect(rango.desde).toBe('2025-08-26T12:00:00.000Z');
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 10, 1).getTime());
    });

    it('sin anclas, coincide con el comportamiento de mes de calendario', () => {
      const rango = resolverRangoEntreMeses([], '2025-09', '2025-09');
      expect(new Date(rango.desde).getTime()).toBe(new Date(2025, 8, 1).getTime());
      expect(new Date(rango.hasta).getTime()).toBe(new Date(2025, 9, 1).getTime());
    });
  });

  describe('periodosEntre', () => {
    it('genera un periodo por mes de calendario, cada uno resuelto con las anclas', () => {
      const periodos = periodosEntre([ancla26Ago, ancla28Sep], '2025-08', '2025-10');
      expect(periodos).toHaveLength(3);
      expect(new Date(periodos[0].rango.desde).getTime()).toBe(new Date(2025, 7, 1).getTime()); // "Agosto": sin ancla propia, empieza el 1
      expect(periodos[0].rango.hasta).toBe('2025-08-26T12:00:00.000Z'); // pero cierra justo antes de la nomina que abre "Septiembre"
      expect(periodos[1].rango).toEqual({ desde: '2025-08-26T12:00:00.000Z', hasta: '2025-09-28T12:00:00.000Z' }); // "Septiembre"
      expect(periodos[2].rango.desde).toBe('2025-09-28T12:00:00.000Z'); // "Octubre"
    });
  });
});
