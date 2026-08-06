import { describe, expect, it } from 'vitest';
import {
  ahorroTotalDelMes,
  balanceNetoDelMes,
  gastoRealTotalDelMes,
  gastoVariableDelMes,
  inversionTotalDelMes,
  tasaAhorroDelMes,
} from '../metricas';
import { indexarSubcategorias } from '../taxonomia';
import type { Movimiento, Subcategoria } from '../../supabase/database.types';

const subcategorias: Subcategoria[] = [
  { id: 1, categoria_id: 1, nombre: 'Salario', es_ingreso_real: true, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 2, categoria_id: 1, nombre: 'Ahorro', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: true, es_inversion: false, es_traspaso: true },
  { id: 3, categoria_id: 1, nombre: 'Inversiones', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: true, es_traspaso: true },
  { id: 4, categoria_id: 2, nombre: 'Alquiler', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 5, categoria_id: 2, nombre: 'Restaurantes', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false },
];

const subcategoriasPorId = indexarSubcategorias(subcategorias);

function mov(subcategoria_id: number, importe: number): Movimiento {
  return {
    id: `${subcategoria_id}-${importe}-${Math.random()}`,
    fecha: '2026-02-10',
    nombre: 'x',
    importe,
    subcategoria_id,
    usuario_id: 'u1',
    creado_por: 'u1',
    visibilidad: 'privado',
    nota: null,
    created_at: '2026-02-10',
    updated_at: '2026-02-10',
  };
}

describe('balanceNetoDelMes', () => {
  it('suma todos los movimientos con signo, incluidos traspasos', () => {
    const movimientos = [mov(1, 2000), mov(4, -800), mov(2, -300), mov(5, -50)];
    expect(balanceNetoDelMes(movimientos)).toBe(850);
  });
});

describe('ahorroTotalDelMes', () => {
  it('invierte el signo: un gasto en Ahorro es ahorro real positivo', () => {
    const movimientos = [mov(2, -300)];
    expect(ahorroTotalDelMes(movimientos, subcategoriasPorId)).toBe(300);
  });

  it('una retirada de Ahorro (positivo) da ahorro real negativo', () => {
    const movimientos = [mov(2, 150)];
    expect(ahorroTotalDelMes(movimientos, subcategoriasPorId)).toBe(-150);
  });

  it('neto de varios movimientos de Ahorro en el mes', () => {
    const movimientos = [mov(2, -300), mov(2, 100)];
    expect(ahorroTotalDelMes(movimientos, subcategoriasPorId)).toBe(200);
  });
});

describe('inversionTotalDelMes', () => {
  it('mismo tratamiento de signo que ahorro, para Inversiones', () => {
    const movimientos = [mov(3, -500)];
    expect(inversionTotalDelMes(movimientos, subcategoriasPorId)).toBe(500);
  });
});

describe('gastoRealTotalDelMes', () => {
  it('excluye los traspasos (Ahorro/Inversiones) del gasto real', () => {
    const movimientos = [mov(4, -800), mov(5, -50), mov(2, -300), mov(3, -500)];
    expect(gastoRealTotalDelMes(movimientos, subcategoriasPorId)).toBe(850);
  });
});

describe('gastoVariableDelMes', () => {
  it('resta el gasto fijo del gasto real total', () => {
    expect(gastoVariableDelMes(850, 800)).toBe(50);
  });
});

describe('tasaAhorroDelMes', () => {
  it('calcula el porcentaje de ingreso real destinado a ahorro+inversion', () => {
    expect(tasaAhorroDelMes(300, 200, 2000)).toBe(25);
  });

  it('devuelve null si no hay ingreso real', () => {
    expect(tasaAhorroDelMes(300, 200, 0)).toBeNull();
  });
});
