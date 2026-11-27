import { describe, expect, it } from 'vitest';
import { bolsasSinClasificar, calcularMetricas, netoPorBolsa } from '../bolsas';
import { balancePorSubcategoria, indexarSubcategorias } from '../taxonomia';
import type { Movimiento, Subcategoria } from '../../supabase/database.types';

// Taxonomia real (Finanzas + las bolsas con su clasificacion de la migracion 0026).
const INGRESO_REAL = ['Salario', 'Paga Extra', 'Variable', 'Beneficios', 'Ingreso Extra'];
const FIJOS = [
  'Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Limpieza', 'Línea Móvil', 'Facturas', 'Letra Coche', 'Seguro Coche',
  'Combustible', 'Supermercado', 'Seguro Médico', 'Gimnasio', 'Clases de Padel', 'Crossfit', 'Suscripciones',
];
const VARIABLES = [
  'TTP', 'Taxi/Uber', 'Parking', 'Peaje', 'Mantenimiento', 'Restaurantes', 'Comida a Domicilio', 'Café', 'Refresco',
  'Alcohol', 'Expendedora', 'Chino', 'Farmacia', 'Higiene', 'Peluquería', 'Dentista', 'Fisioterapia', 'Partido Padel',
  'Material Deportivo', 'Running', 'Viajes', 'Cines', 'Conciertos', 'Espectáculos', 'Actividades', 'Videojuegos',
  'Apuestas/Lotería', 'Libros', 'Discotecas', 'Ropa', 'Electrónica', 'Muebles', 'Decoración', 'Regalos', 'Juguetes',
  'Impuestos', 'Efectivo',
];

const subcategorias: Subcategoria[] = [...INGRESO_REAL, 'Ahorro', 'Inversiones', ...FIJOS, ...VARIABLES].map((nombre, i) => ({
  id: i + 1,
  categoria_id: INGRESO_REAL.includes(nombre) || ['Ahorro', 'Inversiones', 'Impuestos', 'Efectivo'].includes(nombre) ? 8 : 1,
  nombre,
  es_ingreso_real: INGRESO_REAL.includes(nombre),
  es_gasto_fijo: false,
  es_ahorro: nombre === 'Ahorro',
  es_inversion: nombre === 'Inversiones',
  es_traspaso: nombre === 'Ahorro' || nombre === 'Inversiones',
  es_ingreso_condicional: false,
  clase_gasto: FIJOS.includes(nombre) ? 'fijo' : VARIABLES.includes(nombre) ? 'variable' : null,
}));
const porId = indexarSubcategorias(subcategorias);
const idDe = (nombre: string) => subcategorias.find((s) => s.nombre === nombre)!.id;

function mov(fecha: string, sub: string, importe: number, i = 0): Movimiento {
  return { id: `${fecha}-${i}`, fecha, nombre: 'x', importe, subcategoria_id: idDe(sub) } as Movimiento;
}

// Movimientos INVENTADOS (no son datos reales), pensados para dar las cifras del periodo de
// salario a salario del 27/10/2026 13:34 al 25/11/2026 que se usaron para validar la logica.
// Incluyen reembolsos y bizums dentro de su bolsa, retiradas de Ahorro/Inversiones y
// movimientos justo antes y despues del periodo, que no deben contar. Fecha en UTC.
const MOVIMIENTOS: [string, string, number][] = [
  ['2026-10-27T12:00:00Z', 'Restaurantes', -99], // antes de la nomina: fuera
  ['2026-10-27T12:34:00Z', 'Salario', 3700],
  ['2026-10-27T12:40:00Z', 'Ahorro', -1000],
  ['2026-10-27T12:41:00Z', 'Inversiones', -1400],
  ['2026-10-28T09:00:00Z', 'Alquiler', -600],
  ['2026-10-30T18:20:00Z', 'Supermercado', -320.5],
  ['2026-11-02T10:00:00Z', 'Letra Coche', -300],
  ['2026-11-03T08:00:00Z', 'Luz', -45.2],
  ['2026-11-04T21:10:00Z', 'Restaurantes', -150.4],
  ['2026-11-05T09:30:00Z', 'Restaurantes', 40.4], // bizum de vuelta
  ['2026-11-06T12:00:00Z', 'Supermercado', 12.67], // devolucion
  ['2026-11-08T16:45:00Z', 'Ingreso Extra', 50.15],
  ['2026-11-10T07:15:00Z', 'Viajes', -350],
  ['2026-11-12T11:00:00Z', 'Ahorro', 856],
  ['2026-11-13T11:00:00Z', 'Impuestos', -80],
  ['2026-11-15T19:00:00Z', 'Efectivo', -60],
  ['2026-11-18T10:00:00Z', 'Inversiones', 8.59],
  ['2026-11-20T13:00:00Z', 'Regalos', -111.37],
  ['2026-11-22T09:00:00Z', 'Ingreso Extra', 28],
  ['2026-11-25T22:30:00Z', 'Suscripciones', -125], // 23:30 en Madrid: aun dentro
  ['2026-11-25T23:30:00Z', 'Ahorro', -153.34], // 26/11 en Madrid: fuera
  ['2026-11-26T13:22:00Z', 'Salario', 2000], // siguiente nomina: fuera
];

// Periodo de salario a salario: desde la nomina del 27/10/2026 a las 13:34 (hora de Madrid,
// 12:34 UTC) hasta el final del 25/11/2026 (hora de Madrid).
const DESDE = new Date('2026-10-27T12:34:00Z').getTime();
const HASTA = new Date('2026-11-26T00:00:00+01:00').getTime();
const periodo = MOVIMIENTOS.map(([f, s, i], n) => mov(f, s, i, n)).filter((m) => {
  const t = new Date(m.fecha).getTime();
  return t >= DESDE && t < HASTA;
});

describe('calcularMetricas: periodo 27/10/2026 13:34 – 25/11/2026', () => {
  const m = calcularMetricas(periodo, porId);

  it('da las cifras esperadas', () => {
    expect(m.ingresoReal).toBe(3778.15);
    expect(m.gastosFijos).toBe(1378.03);
    expect(m.gastosVariables).toBe(711.37);
    expect(m.gastosTotales).toBe(2089.4);
    expect(m.ahorroNeto).toBe(144);
    expect(m.inversionNeta).toBe(1391.41);
    expect(m.balanceNeto).toBe(153.34);
  });

  it('ingreso real = fijos + variables + ahorro neto + inversion neta + balance', () => {
    const suma = m.gastosFijos + m.gastosVariables + m.ahorroNeto + m.inversionNeta + m.balanceNeto;
    expect(Math.round(suma * 100) / 100).toBe(m.ingresoReal);
  });

  it('los desgloses suman su total', () => {
    const suma = (f: { valor: number }[]) => Math.round(f.reduce((s, x) => s + x.valor, 0) * 100) / 100;
    expect(suma(m.desgloseIngreso)).toBe(m.ingresoReal);
    expect(suma(m.desgloseFijos)).toBe(m.gastosFijos);
    expect(suma(m.desgloseVariables)).toBe(m.gastosVariables);
  });

  it('usa el mismo neteo que el resumen de categorias', () => {
    const resumen = balancePorSubcategoria(periodo, porId, [
      { id: 1, nombre: 'Gastos' },
      { id: 8, nombre: 'Finanzas' },
    ]);
    const fijosResumen = resumen
      .filter((r) => porId.get(r.subcategoriaId)?.clase_gasto === 'fijo')
      .reduce((s, r) => s - r.neto, 0);
    expect(Math.round(fijosResumen * 100) / 100).toBe(m.gastosFijos);
  });
});

describe('netoPorBolsa', () => {
  it('los reembolsos restan dentro de su bolsa', () => {
    const neto = netoPorBolsa([mov('2026-11-01', 'Restaurantes', -40), mov('2026-11-02', 'Restaurantes', 15, 1)]);
    expect(neto.get(idDe('Restaurantes'))).toBe(-25);
  });
});

describe('calcularMetricas: casos limite', () => {
  it('sin ingreso real no hay tasas ni margen', () => {
    const m = calcularMetricas([mov('2026-11-01', 'Luz', -30)], porId);
    expect(m.tasaAhorro).toBeNull();
    expect(m.margenTrasFijos).toBeNull();
    expect(m.gastosFijos).toBe(30);
  });

  it('una bolsa sin clasificar cuenta como variable y se avisa', () => {
    const nueva: Subcategoria = { ...subcategorias[0], id: 999, nombre: 'Nueva', es_ingreso_real: false, clase_gasto: null };
    const m = calcularMetricas([{ ...mov('2026-11-01', 'Luz', -10), subcategoria_id: 999 }], indexarSubcategorias([nueva]));
    expect(m.gastosVariables).toBe(10);
    expect(m.desgloseVariables[0].etiqueta).toBe('Nueva (sin clasificar)');
    expect(bolsasSinClasificar([...subcategorias, nueva]).map((s) => s.nombre)).toEqual(['Nueva']);
  });
});
