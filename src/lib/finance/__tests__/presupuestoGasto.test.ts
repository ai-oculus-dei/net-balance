import { describe, expect, it } from 'vitest';
import {
  PRESUPUESTO_POR_DEFECTO,
  agruparPresupuesto,
  estadoPresupuesto,
  lineasAlLimite,
  lineasDesdeJson,
  presupuestoPorDefecto,
  type LineaPresupuesto,
} from '../presupuestoGasto';
import type { Categoria, Movimiento, Subcategoria } from '../../supabase/database.types';

const sub = (id: number, categoria_id: number, nombre: string): Subcategoria => ({
  id,
  categoria_id,
  nombre,
  es_ingreso_real: false,
  es_gasto_fijo: false,
  es_ahorro: false,
  es_inversion: false,
  es_traspaso: false,
  es_ingreso_condicional: false,
});

const mov = (subcategoria_id: number, importe: number, usuario_id = 'yo'): Movimiento =>
  ({ id: `${subcategoria_id}-${importe}-${usuario_id}`, subcategoria_id, importe, usuario_id, fecha: '2026-11-10' }) as Movimiento;

const linea = (id: string, importe: number, subcategoriaIds: number[], grupo = 'G'): LineaPresupuesto => ({
  id,
  grupo,
  nombre: id,
  importe,
  subcategoriaIds,
});

describe('presupuestoPorDefecto', () => {
  it('suma 1.820 €/mes', () => {
    expect(PRESUPUESTO_POR_DEFECTO.reduce((s, l) => s + l.importe, 0)).toBe(1820);
  });

  it('resuelve las subcategorias por nombre sin importar tildes ni mayusculas', () => {
    const categorias: Categoria[] = [
      { id: 1, nombre: 'Vivienda' },
      { id: 2, nombre: 'Transporte' },
    ];
    const subs = [sub(7, 1, 'Línea Móvil'), sub(14, 2, 'Parking'), sub(15, 2, 'peaje')];
    const lineas = presupuestoPorDefecto(categorias, subs);
    expect(lineas.find((l) => l.nombre === 'Línea móvil')?.subcategoriaIds).toEqual([7]);
    expect(lineas.find((l) => l.nombre === 'Peajes + parking')?.subcategoriaIds).toEqual([15, 14]);
    // Las que no existen en la taxonomia se quedan sin subcategorias.
    expect(lineas.find((l) => l.nombre === 'Luz')?.subcategoriaIds).toEqual([]);
  });
});

describe('estadoPresupuesto', () => {
  it('cuenta gastos netos de devoluciones, solo del usuario', () => {
    const [e] = estadoPresupuesto(
      [linea('super', 100, [16, 18])],
      [mov(16, -60), mov(18, -30), mov(16, 5), mov(16, -500, 'otra')],
      'yo'
    );
    expect(e.gastado).toBe(85);
    expect(e.restante).toBe(15);
    expect(e.pct).toBe(85);
  });

  it('una devolucion mayor que el gasto no da gastado negativo', () => {
    const [e] = estadoPresupuesto([linea('x', 50, [1])], [mov(1, 20)], 'yo');
    expect(e.gastado).toBe(0);
  });
});

describe('lineasAlLimite', () => {
  it('avisa desde el 90 % y ordena por % gastado', () => {
    const estados = estadoPresupuesto(
      [linea('a', 100, [1]), linea('b', 100, [2]), linea('c', 100, [3]), linea('cero', 0, [4])],
      [mov(1, -89.99), mov(2, -90), mov(3, -120), mov(4, -10)],
      'yo'
    );
    expect(lineasAlLimite(estados).map((e) => e.linea.id)).toEqual(['c', 'b']);
  });
});

describe('agruparPresupuesto', () => {
  it('agrupa en orden de aparicion con sus totales', () => {
    const estados = estadoPresupuesto(
      [linea('a', 10, [1], 'Coche'), linea('b', 20, [2], 'Ocio'), linea('c', 5, [3], 'Coche')],
      [mov(1, -4), mov(3, -1)],
      'yo'
    );
    const grupos = agruparPresupuesto(estados);
    expect(grupos.map((g) => [g.grupo, g.importe, g.gastado])).toEqual([
      ['Coche', 15, 5],
      ['Ocio', 20, 0],
    ]);
  });
});

describe('lineasDesdeJson', () => {
  it('normaliza valores raros', () => {
    expect(lineasDesdeJson(null)).toEqual([]);
    expect(lineasDesdeJson([{ id: 'x', grupo: '', nombre: 'N', importe: '12.5', subcategoriaIds: ['3', 'a'] }])).toEqual([
      { id: 'x', grupo: 'Otros', nombre: 'N', importe: 12.5, subcategoriaIds: [3] },
    ]);
  });
});
