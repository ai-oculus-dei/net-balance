import type { Categoria, Movimiento, Subcategoria } from '../supabase/database.types';
import { netoPorBolsa } from './bolsas';

// Objetivos de gasto mensual por grupos (Ajustes -> Objetivos de gasto). Cada linea tiene un
// importe al mes y las subcategorias de la app cuyo gasto cuenta contra ella (una linea puede
// juntar varias, p.ej. "Peajes + parking").
export interface LineaPresupuesto {
  id: string;
  grupo: string;
  nombre: string;
  importe: number; // €/mes
  subcategoriaIds: number[];
}

// Por encima de este porcentaje del objetivo gastado (queda menos de un 10 %) salta el aviso.
export const UMBRAL_AVISO_GASTO = 90;

interface LineaPorDefecto {
  grupo: string;
  nombre: string;
  importe: number;
  // [categoria, subcategoria] por nombre: los ids se resuelven contra la taxonomia real.
  subcategorias: [string, string][];
}

export const PRESUPUESTO_POR_DEFECTO: LineaPorDefecto[] = [
  { grupo: 'Vivienda', nombre: 'Alquiler (tu parte)', importe: 500, subcategorias: [['Vivienda', 'Alquiler']] },
  { grupo: 'Vivienda', nombre: 'Luz', importe: 30, subcategorias: [['Vivienda', 'Luz']] },
  { grupo: 'Vivienda', nombre: 'Gas', importe: 20, subcategorias: [['Vivienda', 'Gas']] },
  { grupo: 'Vivienda', nombre: 'Agua', importe: 7, subcategorias: [['Vivienda', 'Agua']] },
  { grupo: 'Vivienda', nombre: 'Internet', importe: 8, subcategorias: [['Vivienda', 'Internet']] },
  { grupo: 'Vivienda', nombre: 'Línea móvil', importe: 15, subcategorias: [['Vivienda', 'Línea Móvil']] },
  { grupo: 'Coche', nombre: 'Letra', importe: 247, subcategorias: [['Transporte', 'Letra Coche']] },
  { grupo: 'Coche', nombre: 'Seguro', importe: 61, subcategorias: [['Transporte', 'Seguro Coche']] },
  { grupo: 'Coche', nombre: 'Combustible', importe: 45, subcategorias: [['Transporte', 'Combustible']] },
  { grupo: 'Coche', nombre: 'Peajes + parking', importe: 20, subcategorias: [['Transporte', 'Peaje'], ['Transporte', 'Parking']] },
  // No hay subcategoria propia para el impuesto de circulacion: se asigna desde Ajustes.
  { grupo: 'Coche', nombre: 'Impuesto de circulación (prorrateado)', importe: 5, subcategorias: [] },
  { grupo: 'Coche', nombre: 'Mantenimiento', importe: 2, subcategorias: [['Transporte', 'Mantenimiento']] },
  { grupo: 'Alimentación', nombre: 'Supermercado', importe: 175, subcategorias: [['Alimentación', 'Supermercado'], ['Alimentación', 'Chino']] },
  { grupo: 'Alimentación', nombre: 'Restaurantes', importe: 90, subcategorias: [['Alimentación', 'Restaurantes']] },
  { grupo: 'Alimentación', nombre: 'Comida a domicilio', importe: 25, subcategorias: [['Alimentación', 'Comida a Domicilio']] },
  { grupo: 'Alimentación', nombre: 'Café / desayunos', importe: 15, subcategorias: [['Alimentación', 'Café']] },
  {
    grupo: 'Alimentación',
    nombre: 'Expendedora / refrescos / alcohol',
    importe: 15,
    subcategorias: [['Alimentación', 'Expendedora'], ['Alimentación', 'Refresco'], ['Alimentación', 'Alcohol']],
  },
  { grupo: 'Ocio', nombre: 'Videojuegos (incluye PS Plus prorrateado)', importe: 30, subcategorias: [['Ocio', 'Videojuegos']] },
  { grupo: 'Ocio', nombre: 'Conciertos / cine', importe: 25, subcategorias: [['Ocio', 'Conciertos'], ['Ocio', 'Cines'], ['Ocio', 'Espectáculos']] },
  { grupo: 'Ocio', nombre: 'Actividades', importe: 30, subcategorias: [['Ocio', 'Actividades']] },
  { grupo: 'Ocio', nombre: 'Libros', importe: 15, subcategorias: [['Ocio', 'Libros']] },
  { grupo: 'Ocio', nombre: 'Suscripciones', importe: 50, subcategorias: [['Ocio', 'Suscripciones']] },
  { grupo: 'Deporte', nombre: 'Clases de pádel', importe: 59, subcategorias: [['Deporte', 'Clases de Padel']] },
  { grupo: 'Deporte', nombre: 'Gimnasio (cuota anual prorrateada)', importe: 13, subcategorias: [['Deporte', 'Gimnasio']] },
  { grupo: 'Deporte', nombre: 'Partidos de pádel', importe: 30, subcategorias: [['Deporte', 'Partido Padel']] },
  { grupo: 'Deporte', nombre: 'Material deportivo', importe: 18, subcategorias: [['Deporte', 'Material Deportivo']] },
  { grupo: 'Huchas', nombre: 'Viajes', importe: 150, subcategorias: [['Ocio', 'Viajes']] },
  { grupo: 'Huchas', nombre: 'Regalos', importe: 100, subcategorias: [['Compras', 'Regalos']] },
  {
    grupo: 'Otros',
    nombre: 'Salud, higiene, peluquería, hogar',
    importe: 20,
    subcategorias: [['Salud', 'Farmacia'], ['Salud', 'Higiene'], ['Salud', 'Peluquería'], ['Vivienda', 'Limpieza']],
  },
];

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

// Los valores por defecto con los ids reales de la taxonomia (las que no existan se ignoran).
export function presupuestoPorDefecto(categorias: Categoria[], subcategorias: Subcategoria[]): LineaPresupuesto[] {
  const idCategoria = new Map(categorias.map((c) => [normalizar(c.nombre), c.id]));
  return PRESUPUESTO_POR_DEFECTO.map((l, i) => ({
    id: `defecto-${i}`,
    grupo: l.grupo,
    nombre: l.nombre,
    importe: l.importe,
    subcategoriaIds: l.subcategorias
      .map(([cat, sub]) => {
        const categoriaId = idCategoria.get(normalizar(cat));
        return subcategorias.find((s) => s.categoria_id === categoriaId && normalizar(s.nombre) === normalizar(sub))?.id;
      })
      .filter((id): id is number => id !== undefined),
  }));
}

export interface EstadoLineaPresupuesto {
  linea: LineaPresupuesto;
  gastado: number; // neto (gastos menos devoluciones), nunca negativo
  restante: number; // negativo si se ha pasado
  pct: number; // gastado / objetivo * 100 (0 si el objetivo es 0)
}

const round2 = (v: number) => Math.round(v * 100) / 100;

// Gastado en cada linea con los movimientos dados (los del mes en curso). Solo cuentan los
// movimientos del propio usuario: los compartidos de la otra persona tambien llegan por RLS, y
// el presupuesto es "tu parte".
export function estadoPresupuesto(
  lineas: LineaPresupuesto[],
  movimientos: Movimiento[],
  usuarioId: string | undefined
): EstadoLineaPresupuesto[] {
  // Mismo neteo por bolsa que las metricas (ver bolsas.ts).
  const netoPorSub = netoPorBolsa(movimientos.filter((m) => !usuarioId || m.usuario_id === usuarioId));
  return lineas.map((linea) => {
    const neto = linea.subcategoriaIds.reduce((s, id) => s + (netoPorSub.get(id) ?? 0), 0);
    const gastado = round2(Math.max(0, -neto));
    return {
      linea,
      gastado,
      restante: round2(linea.importe - gastado),
      pct: linea.importe > 0 ? (gastado / linea.importe) * 100 : 0,
    };
  });
}

// Lineas a las que les queda menos de un 10 % (o que ya se han pasado), las mas gastadas primero.
export function lineasAlLimite(estados: EstadoLineaPresupuesto[]): EstadoLineaPresupuesto[] {
  return estados.filter((e) => e.linea.importe > 0 && e.pct >= UMBRAL_AVISO_GASTO).sort((a, b) => b.pct - a.pct);
}

export interface GrupoPresupuesto {
  grupo: string;
  estados: EstadoLineaPresupuesto[];
  importe: number;
  gastado: number;
}

// Agrupa respetando el orden en que aparece cada grupo por primera vez.
export function agruparPresupuesto(estados: EstadoLineaPresupuesto[]): GrupoPresupuesto[] {
  const grupos = new Map<string, GrupoPresupuesto>();
  for (const e of estados) {
    const g = grupos.get(e.linea.grupo) ?? { grupo: e.linea.grupo, estados: [], importe: 0, gastado: 0 };
    g.estados.push(e);
    g.importe = round2(g.importe + e.linea.importe);
    g.gastado = round2(g.gastado + e.gastado);
    grupos.set(e.linea.grupo, g);
  }
  return [...grupos.values()];
}

// Normaliza lo que viene de la base de datos (jsonb sin tipar).
export function lineasDesdeJson(valor: unknown): LineaPresupuesto[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v, i) => ({
      id: typeof v.id === 'string' ? v.id : `linea-${i}`,
      grupo: typeof v.grupo === 'string' && v.grupo.trim() ? v.grupo : 'Otros',
      nombre: typeof v.nombre === 'string' ? v.nombre : '',
      importe: Number(v.importe) || 0,
      subcategoriaIds: Array.isArray(v.subcategoriaIds) ? v.subcategoriaIds.map(Number).filter(Number.isFinite) : [],
    }));
}
