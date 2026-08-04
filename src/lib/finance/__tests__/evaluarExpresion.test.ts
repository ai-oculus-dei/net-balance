import { describe, expect, it } from 'vitest';
import { evaluarExpresion } from '../evaluarExpresion';

describe('evaluarExpresion', () => {
  it('evalua un numero simple', () => {
    expect(evaluarExpresion('27')).toBe(27);
    expect(evaluarExpresion('27.5')).toBe(27.5);
  });

  it('evalua una division simple', () => {
    expect(evaluarExpresion('27/2')).toBe(13.5);
  });

  it('respeta la precedencia de multiplicacion/division sobre suma/resta', () => {
    expect(evaluarExpresion('2+3*4')).toBe(14);
    expect(evaluarExpresion('10-4/2')).toBe(8);
  });

  it('redondea el resultado a 2 decimales', () => {
    expect(evaluarExpresion('10/3')).toBe(3.33);
  });

  it('devuelve null para expresiones incompletas o invalidas', () => {
    expect(evaluarExpresion('')).toBeNull();
    expect(evaluarExpresion('27+')).toBeNull();
    expect(evaluarExpresion('+27')).toBeNull();
    expect(evaluarExpresion('27//2')).toBeNull();
  });

  it('devuelve null en division entre cero', () => {
    expect(evaluarExpresion('5/0')).toBeNull();
  });
});
