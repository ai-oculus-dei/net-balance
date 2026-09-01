import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  mesEtiquetaDelPeriodoActual,
  periodosEntre,
  resolverPeriodoActual,
  resolverRangoEntreMeses,
  resolverRangoMes,
  type AnclaPeriodo,
} from '../periodos';

declare const process: { env: { TZ?: string } };

// Ejemplo real usado para validar el diseño con el usuario: nomina marcada el 26 de agosto de
// 2025 (etiqueta "Septiembre") y la siguiente el 28 de septiembre de 2025 (etiqueta "Octubre").
const ancla26Ago: AnclaPeriodo = { fecha: '2025-08-26T09:00:00Z' };
const ancla28Sep: AnclaPeriodo = { fecha: '2025-09-28T09:00:00Z' };

describe('periodos de pago (zona horaria España, por delante de UTC)', () => {
  const tzOriginal = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Madrid';
  });

  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  describe('resolverRangoMes', () => {
    it('sin anclas, cae al mes de calendario normal', () => {
      const rango = resolverRangoMes([], new Date(2025, 8, 15)); // 15 sept 2025
      expect(rango).toEqual({ desde: '2025-09-01', hasta: '2025-10-01' });
    });

    it('una ancla sin siguiente: el periodo queda abierto (sin fecha limite real)', () => {
      const rango = resolverRangoMes([ancla26Ago], new Date(2025, 8, 1)); // etiqueta "Septiembre"
      expect(rango.desde).toBe('2025-08-26');
      expect(rango.hasta).toBe('9999-12-31');
    });

    it('con dos anclas, el mes etiquetado por la primera va de una a la otra (caso del usuario)', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 8, 1)); // "Septiembre"
      expect(rango).toEqual({ desde: '2025-08-26', hasta: '2025-09-28' });
    });

    it('el mes etiquetado por la segunda ancla queda abierto', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 9, 1)); // "Octubre"
      expect(rango.desde).toBe('2025-09-28');
      expect(rango.hasta).toBe('9999-12-31');
    });

    it('un mes muy anterior a cualquier ancla cae al mes de calendario normal', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 5, 1)); // "Junio", antes de todo
      expect(rango).toEqual({ desde: '2025-06-01', hasta: '2025-07-01' });
    });

    it('un mes posterior a la ultima ancla, ya cubierto por su periodo abierto, no duplica: queda vacio', () => {
      const rango = resolverRangoMes([ancla26Ago, ancla28Sep], new Date(2025, 11, 1)); // "Diciembre"
      expect(rango.desde).toBe(rango.hasta);
    });

    it('no depende del orden de entrada de las anclas', () => {
      const rango = resolverRangoMes([ancla28Sep, ancla26Ago], new Date(2025, 8, 1));
      expect(rango).toEqual({ desde: '2025-08-26', hasta: '2025-09-28' });
    });

    describe('mes olvidado (sin ancla propia) entre dos anclas reales', () => {
      // Ancla el 26 de julio (etiqueta "Agosto") y siguiente el 28 de septiembre (etiqueta
      // "Octubre"): la nomina de "Septiembre" nunca se marco. El periodo de "Agosto" no tiene
      // otra ancla que lo cierre hasta el 28 de septiembre, asi que ya cubre todo septiembre.
      const ancla26Jul: AnclaPeriodo = { fecha: '2025-07-26T09:00:00Z' };

      it('"Agosto" (con ancla) se extiende hasta la siguiente ancla real, sin recortar', () => {
        const rango = resolverRangoMes([ancla26Jul, ancla28Sep], new Date(2025, 7, 1)); // "Agosto"
        expect(rango).toEqual({ desde: '2025-07-26', hasta: '2025-09-28' });
      });

      it('"Septiembre" (sin ancla) no duplica lo que ya cubre "Agosto": queda vacio', () => {
        const rango = resolverRangoMes([ancla26Jul, ancla28Sep], new Date(2025, 8, 1)); // "Septiembre"
        expect(rango.desde).toBe(rango.hasta);
      });

      it('un mes olvidado tras la ultima ancla (periodo abierto) tambien queda vacio, no duplica', () => {
        // Solo una ancla (26 jul, "Agosto"), abierta indefinidamente. "Octubre" ya esta cubierto
        // por ese periodo abierto, no debe generar un fallback de calendario aparte.
        const rango = resolverRangoMes([ancla26Jul], new Date(2025, 9, 1)); // "Octubre"
        expect(rango.desde).toBe(rango.hasta);
      });

      it('un mes muy anterior a la primera ancla sigue cayendo al mes de calendario normal, sin recortar', () => {
        const rango = resolverRangoMes([ancla26Jul, ancla28Sep], new Date(2025, 0, 1)); // "Enero", antes de todo
        expect(rango).toEqual({ desde: '2025-01-01', hasta: '2025-02-01' });
      });
    });
  });

  describe('resolverPeriodoActual', () => {
    it('sin anclas anteriores a "hoy", cae al mes de calendario de hoy', () => {
      const rango = resolverPeriodoActual([ancla26Ago], new Date(2025, 6, 15)); // 15 julio, antes del ancla
      expect(rango).toEqual({ desde: '2025-07-01', hasta: '2025-08-01' });
    });

    it('hoy dentro del periodo abierto de la unica ancla', () => {
      const rango = resolverPeriodoActual([ancla26Ago], new Date(2025, 8, 10)); // 10 sept
      expect(rango.desde).toBe('2025-08-26');
      expect(rango.hasta).toBe('9999-12-31');
    });

    it('hoy justo el dia de una ancla: ese dia ya pertenece al periodo que empieza', () => {
      const rango = resolverPeriodoActual([ancla26Ago, ancla28Sep], new Date(2025, 8, 28)); // 28 sept
      expect(rango.desde).toBe('2025-09-28');
    });

    it('el dia antes de la siguiente ancla sigue perteneciendo al periodo anterior', () => {
      const rango = resolverPeriodoActual([ancla26Ago, ancla28Sep], new Date(2025, 8, 27)); // 27 sept
      expect(rango).toEqual({ desde: '2025-08-26', hasta: '2025-09-28' });
    });

    it('caso critico: "hoy" ya cruzo a un periodo con etiqueta de mes distinta a la de hoy en calendario', () => {
      // Hoy calendario = 29 de septiembre, pero la nomina del 28 de septiembre ya empezo
      // "Octubre" — resolverPeriodoActual debe devolver el periodo real (Octubre), no
      // resolverRangoMes(anclas, hoy) que devolveria el rango etiquetado "Septiembre".
      const rango = resolverPeriodoActual([ancla26Ago, ancla28Sep], new Date(2025, 8, 29));
      expect(rango.desde).toBe('2025-09-28');
      expect(rango.hasta).toBe('9999-12-31');
    });
  });

  describe('mesEtiquetaDelPeriodoActual', () => {
    it('sin ancla anterior, devuelve la propia fecha de hoy', () => {
      const d = mesEtiquetaDelPeriodoActual([], new Date(2025, 8, 15));
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(8); // septiembre
    });

    it('con ancla, devuelve el dia 1 del mes etiqueta (no el mes de calendario de hoy)', () => {
      // Hoy = 29 sept, pero el periodo real ya es "Octubre".
      const d = mesEtiquetaDelPeriodoActual([ancla26Ago, ancla28Sep], new Date(2025, 8, 29));
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(9); // octubre
    });

    it('una ancla en diciembre etiqueta "Enero" del año siguiente', () => {
      const anclaDic: AnclaPeriodo = { fecha: '2025-12-27T09:00:00Z' };
      const d = mesEtiquetaDelPeriodoActual([anclaDic], new Date(2026, 0, 5));
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(0); // enero
    });
  });

  describe('resolverRangoEntreMeses', () => {
    it('resuelve cada extremo con las anclas del usuario', () => {
      const rango = resolverRangoEntreMeses([ancla26Ago, ancla28Sep], '2025-09', '2025-10');
      expect(rango.desde).toBe('2025-08-26'); // inicio del periodo "Septiembre"
      expect(rango.hasta).toBe('9999-12-31'); // "Octubre" queda abierto
    });

    it('sin anclas, coincide con el comportamiento de mes de calendario', () => {
      const rango = resolverRangoEntreMeses([], '2025-09', '2025-09');
      expect(rango).toEqual({ desde: '2025-09-01', hasta: '2025-10-01' });
    });
  });

  describe('periodosEntre', () => {
    it('genera un periodo por mes de calendario, cada uno resuelto con las anclas', () => {
      const periodos = periodosEntre([ancla26Ago, ancla28Sep], '2025-08', '2025-10');
      expect(periodos).toHaveLength(3);
      expect(periodos[0].rango).toEqual({ desde: '2025-08-01', hasta: '2025-08-26' }); // "Agosto": sin ancla, recortado por "Septiembre"
      expect(periodos[1].rango).toEqual({ desde: '2025-08-26', hasta: '2025-09-28' }); // "Septiembre"
      expect(periodos[2].rango).toEqual({ desde: '2025-09-28', hasta: '9999-12-31' }); // "Octubre"
    });
  });
});
