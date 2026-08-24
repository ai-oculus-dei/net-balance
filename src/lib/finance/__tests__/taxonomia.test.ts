import { describe, expect, it } from 'vitest';
import { balancePorSubcategoria, indexarSubcategorias, ingresoRealDelMes } from '../taxonomia';
import type { Categoria, Movimiento, Subcategoria } from '../../supabase/database.types';

const categorias: Categoria[] = [
  { id: 1, nombre: 'Vivienda' },
  { id: 2, nombre: 'Alimentación' },
];

const subcategorias: Subcategoria[] = [
  { id: 10, categoria_id: 1, nombre: 'Alquiler', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false, es_ingreso_condicional: false },
  { id: 11, categoria_id: 1, nombre: 'Luz', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false, es_ingreso_condicional: false },
  { id: 20, categoria_id: 2, nombre: 'Restaurantes', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false, es_ingreso_condicional: false },
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

const subcategoriasIngreso: Subcategoria[] = [
  { id: 1, categoria_id: 1, nombre: 'Salario', es_ingreso_real: true, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false, es_ingreso_condicional: false },
  { id: 2, categoria_id: 1, nombre: 'Ingreso Extra', es_ingreso_real: true, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false, es_ingreso_condicional: false },
  { id: 3, categoria_id: 1, nombre: 'Impuestos', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: true, es_ingreso_condicional: true },
  { id: 4, categoria_id: 1, nombre: 'Ahorro', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: true, es_inversion: false, es_traspaso: true, es_ingreso_condicional: true },
  { id: 5, categoria_id: 1, nombre: 'Efectivo', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: true, es_ingreso_condicional: true },
  { id: 6, categoria_id: 1, nombre: 'Inversiones', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: true, es_traspaso: true, es_ingreso_condicional: true },
];

const subcategoriasIngresoPorId = indexarSubcategorias(subcategoriasIngreso);

describe('ingresoRealDelMes', () => {
  it('suma siempre las subcategorias incondicionales, con signo', () => {
    const movimientos = [mov(1, 2000), mov(2, 100)];
    expect(ingresoRealDelMes(movimientos, subcategoriasIngresoPorId)).toBe(2100);
  });

  it('suma una condicional cuando su balance neto del mes es positivo', () => {
    const movimientos = [mov(1, 2000), mov(3, 50)];
    expect(ingresoRealDelMes(movimientos, subcategoriasIngresoPorId)).toBe(2050);
  });

  it('no resta una condicional cuando su balance neto del mes es negativo', () => {
    const movimientos = [mov(1, 2000), mov(4, -300)];
    expect(ingresoRealDelMes(movimientos, subcategoriasIngresoPorId)).toBe(2000);
  });

  it('combina varias condicionales, cada una evaluada de forma independiente', () => {
    const movimientos = [mov(1, 2000), mov(4, -300), mov(4, 500), mov(5, 20), mov(6, -100)];
    // Ahorro: -300 + 500 = 200 (positivo, suma 200). Efectivo: 20 (positivo, suma 20).
    // Inversiones: -100 (negativo, no suma nada).
    expect(ingresoRealDelMes(movimientos, subcategoriasIngresoPorId)).toBe(2220);
  });
});

describe('balancePorSubcategoria', () => {
  it('solo incluye subcategorias con movimientos, con su neto', () => {
    const movimientos = [mov(10, -800), mov(11, -50), mov(11, 20)];
    expect(balancePorSubcategoria(movimientos, subcategoriasPorId, categorias)).toEqual([
      { subcategoriaId: 10, categoriaId: 1, categoria: 'Vivienda', subcategoria: 'Alquiler', neto: -800 },
      { subcategoriaId: 11, categoriaId: 1, categoria: 'Vivienda', subcategoria: 'Luz', neto: -30 },
    ]);
  });

  it('ordena por categoria y luego subcategoria', () => {
    const movimientos = [mov(20, -40), mov(10, -800)];
    const resultado = balancePorSubcategoria(movimientos, subcategoriasPorId, categorias);
    expect(resultado.map((r) => r.subcategoria)).toEqual(['Alquiler', 'Restaurantes']);
  });
});
