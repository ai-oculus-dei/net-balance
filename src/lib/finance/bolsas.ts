import type { Movimiento, Subcategoria } from '../supabase/database.types';
import type { SubcategoriasPorId } from './taxonomia';

// ============================================================
// Neteo por bolsa: la UNICA forma de agregar movimientos que usan todas las pantallas
// (Metricas de Inicio y Graficas, Resumen de categorias, objetivos de gasto).
//
// Cada subcategoria es una "bolsa": su neto del periodo = lo que entra - lo que sale (la suma
// de importes con signo). Reembolsos, bizums y Tricount entran en la misma subcategoria que el
// gasto y lo restan ahi mismo.
//
// Roles (por los flags de la subcategoria):
//   * ingreso real  -> Finanzas: Salario, Paga Extra, Variable, Beneficios, Ingreso Extra
//   * ahorro        -> Finanzas: Ahorro
//   * inversion     -> Finanzas: Inversiones
//   * bolsa de gasto-> todo lo demas (incluidas Finanzas: Impuestos y Efectivo), clasificada
//                      como fija o variable con `clase_gasto` (editable en Ajustes)
// ============================================================

export type ClaseGasto = 'fijo' | 'variable';
export type RolSubcategoria = 'ingreso_real' | 'ahorro' | 'inversion' | 'gasto';

export function rolSubcategoria(sub: Subcategoria): RolSubcategoria {
  if (sub.es_ingreso_real) return 'ingreso_real';
  if (sub.es_ahorro) return 'ahorro';
  if (sub.es_inversion) return 'inversion';
  return 'gasto';
}

// Bolsas de gasto todavia sin clasificar como fijas o variables (p.ej. una subcategoria nueva).
export function bolsasSinClasificar(subcategorias: Subcategoria[]): Subcategoria[] {
  return subcategorias.filter((s) => rolSubcategoria(s) === 'gasto' && !s.clase_gasto);
}

// Se suma en centimos enteros para que los netos no arrastren errores de coma flotante.
const aCentimos = (v: number) => Math.round(v * 100);

// Neto (entradas - salidas) de cada subcategoria con movimientos.
export function netoPorBolsa(movimientos: Movimiento[]): Map<number, number> {
  const centimos = new Map<number, number>();
  for (const m of movimientos) {
    centimos.set(m.subcategoria_id, (centimos.get(m.subcategoria_id) ?? 0) + aCentimos(Number(m.importe)));
  }
  return new Map([...centimos].map(([id, c]) => [id, c / 100]));
}

export interface FilaDesglose {
  etiqueta: string;
  valor: number;
}

export interface MetricasPeriodo {
  ingresoReal: number;
  gastosFijos: number; // en positivo = dinero que ha salido
  gastosVariables: number; // incluye las bolsas sin clasificar
  gastosTotales: number; // fijos + variables
  ahorroNeto: number; // lo que se ha metido en Ahorro - lo que se ha sacado
  inversionNeta: number; // igual, para Inversiones
  balanceNeto: number; // ingreso real - gastos totales - ahorro neto - inversion neta
  tasaAhorro: number | null; // % del ingreso real (null sin ingreso real)
  tasaInversion: number | null;
  margenTrasFijos: number | null; // (ingreso real - fijos) / ingreso real, en %
  pctGastado: number | null; // gastos totales / ingreso real, en %
  desgloseIngreso: FilaDesglose[];
  desgloseFijos: FilaDesglose[];
  desgloseVariables: FilaDesglose[];
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const pctDe = (v: number, base: number) => (base > 0 ? round2((v / base) * 100) : null);

function ordenarFilas(filas: FilaDesglose[]): FilaDesglose[] {
  return filas.filter((f) => f.valor !== 0).sort((a, b) => b.valor - a.valor);
}

export function calcularMetricas(movimientos: Movimiento[], subcategorias: SubcategoriasPorId): MetricasPeriodo {
  let ingreso = 0;
  let fijos = 0;
  let variables = 0;
  let ahorro = 0;
  let inversion = 0;
  const desgloseIngreso: FilaDesglose[] = [];
  const desgloseFijos: FilaDesglose[] = [];
  const desgloseVariables: FilaDesglose[] = [];

  for (const [subId, neto] of netoPorBolsa(movimientos)) {
    const sub = subcategorias.get(subId);
    if (!sub) continue;
    const c = aCentimos(neto);
    switch (rolSubcategoria(sub)) {
      case 'ingreso_real':
        ingreso += c;
        desgloseIngreso.push({ etiqueta: sub.nombre, valor: neto });
        break;
      case 'ahorro':
        ahorro -= c;
        break;
      case 'inversion':
        inversion -= c;
        break;
      case 'gasto':
        if (sub.clase_gasto === 'fijo') {
          fijos -= c;
          desgloseFijos.push({ etiqueta: sub.nombre, valor: -neto });
        } else {
          variables -= c;
          desgloseVariables.push({
            etiqueta: sub.clase_gasto ? sub.nombre : `${sub.nombre} (sin clasificar)`,
            valor: -neto,
          });
        }
        break;
    }
  }

  const totales = fijos + variables;
  const balance = ingreso - totales - ahorro - inversion;
  const e = (centimos: number) => centimos / 100;

  return {
    ingresoReal: e(ingreso),
    gastosFijos: e(fijos),
    gastosVariables: e(variables),
    gastosTotales: e(totales),
    ahorroNeto: e(ahorro),
    inversionNeta: e(inversion),
    balanceNeto: e(balance),
    tasaAhorro: pctDe(e(ahorro), e(ingreso)),
    tasaInversion: pctDe(e(inversion), e(ingreso)),
    margenTrasFijos: pctDe(e(ingreso - fijos), e(ingreso)),
    pctGastado: pctDe(e(totales), e(ingreso)),
    desgloseIngreso: ordenarFilas(desgloseIngreso),
    desgloseFijos: ordenarFilas(desgloseFijos),
    desgloseVariables: ordenarFilas(desgloseVariables),
  };
}
