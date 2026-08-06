import { describe, expect, it } from 'vitest';
import { balancePorSubcategoria, indexarSubcategorias } from '../taxonomia';
import type { Categoria, Movimiento, Subcategoria } from '../../supabase/database.types';

const categorias: Categoria[] = [
  { id: 1, nombre: 'Vivienda' },
  { id: 2, nombre: 'Alimentación' },
];

const subcategorias: Subcategoria[] = [
  { id: 10, categoria_id: 1, nombre: 'Alquiler', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 11, categoria_id: 1, nombre: 'Luz', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 20, categoria_id: 2, nombre: 'Restaurantes', es_ingreso_real: false, es_gasto_fijo: false, es_ahorro: false, es_inversion: false, es_traspaso: false },
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
