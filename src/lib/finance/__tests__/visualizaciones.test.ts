import { describe, expect, it } from 'vitest';
import { etiquetaLinea, serieTemporalPorLineas, totalesPorLinea, type LineaSeleccion } from '../visualizaciones';
import { indexarSubcategorias } from '../taxonomia';
import type { Categoria, Movimiento, Subcategoria } from '../../supabase/database.types';

const categorias: Categoria[] = [
  { id: 1, nombre: 'Vivienda' },
  { id: 2, nombre: 'Transporte' },
];

const subcategorias: Subcategoria[] = [
  { id: 10, categoria_id: 1, nombre: 'Alquiler', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 11, categoria_id: 1, nombre: 'Luz', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
  { id: 20, categoria_id: 2, nombre: 'Letra Coche', es_ingreso_real: false, es_gasto_fijo: true, es_ahorro: false, es_inversion: false, es_traspaso: false },
];

const subcategoriasPorId = indexarSubcategorias(subcategorias);

function mov(fecha: string, subcategoria_id: number, importe: number): Movimiento {
  return {
    id: fecha + subcategoria_id + importe,
    fecha,
    nombre: 'x',
    importe,
    subcategoria_id,
    usuario_id: 'u1',
    creado_por: 'u1',
    visibilidad: 'privado',
    nota: null,
    created_at: fecha,
    updated_at: fecha,
  };
}

describe('etiquetaLinea', () => {
  it('muestra "Todas" cuando no hay subcategoria concreta', () => {
    const linea: LineaSeleccion = { id: 'a', colorIndex: 0, categoriaId: 1, subcategoriaId: null };
    expect(etiquetaLinea(linea, categorias, subcategorias)).toBe('Vivienda · Todas');
  });

  it('muestra categoria y subcategoria cuando hay una concreta', () => {
    const linea: LineaSeleccion = { id: 'a', colorIndex: 0, categoriaId: 2, subcategoriaId: 20 };
    expect(etiquetaLinea(linea, categorias, subcategorias)).toBe('Transporte · Letra Coche');
  });
});

describe('serieTemporalPorLineas', () => {
  it('suma por mes solo los movimientos de la subcategoria elegida', () => {
    const movimientos = [
      mov('2026-01-15', 10, -800), // Alquiler enero
      mov('2026-01-20', 11, -50), // Luz enero
      mov('2026-02-10', 10, -800), // Alquiler febrero
      mov('2026-02-05', 20, -200), // Letra coche febrero (otra linea)
    ];
    const lineas: LineaSeleccion[] = [{ id: 'alquiler', colorIndex: 0, categoriaId: 1, subcategoriaId: 10 }];
    const serie = serieTemporalPorLineas(movimientos, lineas, subcategoriasPorId, new Date(2026, 0, 1), new Date(2026, 1, 1));
    expect(serie).toEqual([
      { mes: 'ene 26', valores: { alquiler: -800 } },
      { mes: 'feb 26', valores: { alquiler: -800 } },
    ]);
  });

  it('con subcategoriaId null suma todas las subcategorias de la categoria (balance neto)', () => {
    const movimientos = [
      mov('2026-01-15', 10, -800), // Alquiler
      mov('2026-01-20', 11, -50), // Luz
      mov('2026-01-25', 11, 20), // reembolso de luz
    ];
    const lineas: LineaSeleccion[] = [{ id: 'vivienda', colorIndex: 0, categoriaId: 1, subcategoriaId: null }];
    const serie = serieTemporalPorLineas(movimientos, lineas, subcategoriasPorId, new Date(2026, 0, 1), new Date(2026, 0, 1));
    expect(serie).toEqual([{ mes: 'ene 26', valores: { vivienda: -830 } }]);
  });
});

describe('totalesPorLinea', () => {
  it('suma el total neto de cada linea en todo el rango', () => {
    const movimientos = [mov('2026-01-15', 10, -800), mov('2026-02-10', 10, -800), mov('2026-02-05', 20, -200)];
    const lineas: LineaSeleccion[] = [
      { id: 'alquiler', colorIndex: 0, categoriaId: 1, subcategoriaId: 10 },
      { id: 'coche', colorIndex: 1, categoriaId: 2, subcategoriaId: 20 },
    ];
    expect(totalesPorLinea(movimientos, lineas, subcategoriasPorId)).toEqual([
      { lineaId: 'alquiler', total: -1600 },
      { lineaId: 'coche', total: -200 },
    ]);
  });
});
