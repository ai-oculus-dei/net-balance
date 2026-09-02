import { describe, expect, it } from 'vitest';
import { formatearCantidad, formatearImporte } from '../formato';

describe('formatearImporte', () => {
  it('separa los miles con coma y fija 2 decimales por defecto', () => {
    expect(formatearImporte(1234.5)).toBe('1,234.50');
    expect(formatearImporte(1234567.891)).toBe('1,234,567.89');
  });

  it('sin miles, solo fija decimales', () => {
    expect(formatearImporte(42)).toBe('42.00');
  });

  it('acepta un numero de decimales distinto', () => {
    expect(formatearImporte(1234.5, 0)).toBe('1,235');
  });

  it('funciona con numeros negativos', () => {
    expect(formatearImporte(-1234.5)).toBe('-1,234.50');
  });
});

describe('formatearCantidad', () => {
  it('separa los miles sin forzar decimales de mas', () => {
    expect(formatearCantidad(1234)).toBe('1,234');
    expect(formatearCantidad(6)).toBe('6');
  });

  it('conserva hasta 8 decimales para cantidades fraccionarias', () => {
    expect(formatearCantidad(0.00543210)).toBe('0.0054321');
  });

  it('redondea si supera el maximo de decimales', () => {
    expect(formatearCantidad(1.123456789)).toBe('1.12345679');
  });
});
