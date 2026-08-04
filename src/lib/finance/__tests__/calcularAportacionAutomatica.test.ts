import { describe, expect, it } from 'vitest';
import { calcularAportacionAutomatica } from '../calcularAportacionAutomatica';

describe('calcularAportacionAutomatica', () => {
  it('reparte lo que falta entre los meses restantes', () => {
    const hoy = new Date(2026, 0, 1); // enero 2026
    const fechaObjetivo = new Date(2026, 5, 1); // junio 2026 -> 5 meses
    const importe = calcularAportacionAutomatica({ meta: 1000, acumulado: 0, fechaObjetivo }, hoy);
    expect(importe).toBe(200);
  });

  it('devuelve 0 si la meta ya esta cubierta', () => {
    const hoy = new Date(2026, 0, 1);
    const fechaObjetivo = new Date(2026, 5, 1);
    const importe = calcularAportacionAutomatica({ meta: 1000, acumulado: 1200, fechaObjetivo }, hoy);
    expect(importe).toBe(0);
  });

  it('aporta todo lo que falta si la fecha objetivo ya paso o es el mes actual', () => {
    const hoy = new Date(2026, 5, 15);
    const fechaObjetivo = new Date(2026, 5, 1);
    const importe = calcularAportacionAutomatica({ meta: 500, acumulado: 100, fechaObjetivo }, hoy);
    expect(importe).toBe(400);
  });
});
