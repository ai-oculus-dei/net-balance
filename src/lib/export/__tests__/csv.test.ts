import { describe, expect, it } from 'vitest';
import { aCsv, csvMovimientos, csvPatrimonio } from '../csv';
import type { Movimiento, Subcategoria } from '../../supabase/database.types';

const sinBom = (s: string) => s.replace(/^﻿/, '');

describe('aCsv', () => {
  it('usa ";" como separador, coma decimal, BOM y CRLF', () => {
    const csv = aCsv(['A', 'B'], [['x', 1234.5]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(sinBom(csv)).toBe('A;B\r\nx;1234,50\r\n');
  });

  it('entrecomilla celdas con separador, comillas o saltos de linea', () => {
    expect(sinBom(aCsv(['A'], [['a;b'], ['di "hola"'], ['l1\nl2']]))).toBe('A\r\n"a;b"\r\n"di ""hola"""\r\n"l1\nl2"\r\n');
  });

  it('deja vacias las celdas null/undefined', () => {
    expect(sinBom(aCsv(['A', 'B', 'C'], [[null, undefined, 0]]))).toBe('A;B;C\r\n;;0,00\r\n');
  });
});

describe('csvMovimientos', () => {
  const sub: Subcategoria = {
    id: 4,
    categoria_id: 3,
    nombre: 'Supermercado',
    es_ingreso_real: false,
    es_gasto_fijo: true,
    es_ahorro: false,
    es_inversion: false,
    es_traspaso: false,
    es_ingreso_condicional: false,
  };
  const mov = (id: string, fecha: string, importe: number): Movimiento => ({
    id,
    fecha,
    nombre: `m${id}`,
    importe,
    subcategoria_id: 4,
    usuario_id: 'u1',
    creado_por: 'u1',
    visibilidad: 'privado',
    nota: null,
    es_primer_dia_mes: false,
    created_at: '',
    updated_at: '',
  });

  it('ordena del mas antiguo al mas reciente y resuelve categoria, subcategoria y usuario', () => {
    const csv = sinBom(
      csvMovimientos(
        [mov('2', new Date(2026, 10, 18, 20, 5).toISOString(), -12.5), mov('1', new Date(2026, 10, 2, 9, 0).toISOString(), 30)],
        [sub],
        [{ id: 3, nombre: 'Alimentación' }],
        [{ id: 'u1', nombre: 'Ana' }]
      )
    );
    const lineas = csv.trimEnd().split('\r\n');
    expect(lineas[0]).toBe('Fecha;Hora;Nombre;Tipo;Categoría;Subcategoría;Importe (€);Usuario;Visibilidad;Nota');
    expect(lineas[1]).toBe('2026-11-02;09:00;m1;Ingreso;Alimentación;Supermercado;30,00;Ana;Privado;');
    expect(lineas[2]).toBe('2026-11-18;20:05;m2;Gasto;Alimentación;Supermercado;-12,50;Ana;Privado;');
  });
});

describe('csvPatrimonio', () => {
  it('una columna por activo y el total del dia; vacio si ese dia no tenia valor', () => {
    const csv = sinBom(
      csvPatrimonio({
        activos: [
          { id: 'a', nombre: 'Cuenta', ticker: null, tipo: 'cuenta_remunerada' },
          { id: 'b', nombre: 'Vanguard', ticker: 'VWCE.DE', tipo: 'etf' },
        ],
        filas: [
          { fecha: '2026-11-01', valores: { a: 1000 } },
          { fecha: '2026-11-02', valores: { a: 1000, b: 250.1 } },
        ],
      })
    );
    const lineas = csv.trimEnd().split('\r\n');
    expect(lineas[1]).toBe('2026-11-01;1000,00;;1000,00');
    expect(lineas[2]).toBe('2026-11-02;1000,00;250,10;1250,10');
    expect(lineas[0].startsWith('Fecha;Cuenta (')).toBe(true);
    expect(lineas[0]).toContain('Vanguard [VWCE.DE] (');
    expect(lineas[0].endsWith(';Total (€)')).toBe(true);
  });
});
