import { describe, expect, it } from 'vitest';
import { formatearCantidad, formatearCantidadTruncada, formatearImporte, formatearImporteCorto } from '../formato';

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

describe('formatearCantidadTruncada', () => {
  it('trunca en vez de redondear, a 4 decimales por defecto', () => {
    expect(formatearCantidadTruncada(1.123459)).toBe('1.1234'); // redondear daria 1.1235
  });

  it('sin decimales de mas si el valor no los tiene', () => {
    expect(formatearCantidadTruncada(6)).toBe('6');
  });

  it('separa los miles', () => {
    expect(formatearCantidadTruncada(1234.56789)).toBe('1,234.5678');
  });
});

describe('formatearImporteCorto', () => {
  it('por debajo de 1000 no abrevia', () => {
    expect(formatearImporteCorto(50.25)).toBe('50.25');
  });

  it('abrevia en miles a partir de 1000', () => {
    expect(formatearImporteCorto(1234.56)).toBe('1.23k');
    expect(formatearImporteCorto(66277)).toBe('66.28k');
  });
});
