import { describe, expect, it } from 'vitest';
import { calcularDisponible } from '../calcularDisponible';

describe('calcularDisponible', () => {
  it('devuelve el disponible normal cuando sobra tras aportar', () => {
    const resultado = calcularDisponible(2000, 800, [{ objetivoId: 'a', importe: 300 }]);
    expect(resultado.disponible).toBe(900);
    expect(resultado.aportacionesAplicadas).toEqual([{ objetivoId: 'a', importe: 300 }]);
  });

  it('reduce las aportaciones a prorrata cuando el disponible seria negativo', () => {
    // disponible antes de aportar = 2000 - 1900 = 100; deseado total = 400 -> factor 0.25
    const resultado = calcularDisponible(2000, 1900, [
      { objetivoId: 'a', importe: 300 },
      { objetivoId: 'b', importe: 100 },
    ]);
    expect(resultado.disponible).toBe(0);
    expect(resultado.aportacionesAplicadas).toEqual([
      { objetivoId: 'a', importe: 75 },
      { objetivoId: 'b', importe: 25 },
    ]);
  });

  it('pone las aportaciones a 0 si ya no hay presupuesto ni para gastos fijos', () => {
    const resultado = calcularDisponible(1000, 1500, [{ objetivoId: 'a', importe: 200 }]);
    expect(resultado.disponible).toBe(-500);
    expect(resultado.aportacionesAplicadas).toEqual([{ objetivoId: 'a', importe: 0 }]);
  });

  it('funciona sin objetivos activos', () => {
    const resultado = calcularDisponible(1500, 500, []);
    expect(resultado.disponible).toBe(1000);
    expect(resultado.aportacionesAplicadas).toEqual([]);
  });
});
