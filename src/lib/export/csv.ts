import type { Categoria, Movimiento, Profile, Subcategoria } from '../supabase/database.types';
import { ETIQUETA_TIPO, type ValoresDiariosPatrimonio } from '../finance/patrimonio';

// CSV pensado para abrirse directamente en Excel/Numbers en español: separador ";" y coma
// decimal (con "," como separador, Excel en es-ES lo abre todo en una sola columna), BOM UTF-8
// para que respete tildes y "€", y saltos de linea CRLF.
const SEPARADOR = ';';
const BOM = '﻿';

type Celda = string | number | null | undefined;

function formatearNumero(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

function escapar(celda: Celda): string {
  if (celda === null || celda === undefined) return '';
  const texto = typeof celda === 'number' ? formatearNumero(celda) : celda;
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(cabecera: string[], filas: Celda[][]): string {
  const lineas = [cabecera, ...filas].map((fila) => fila.map(escapar).join(SEPARADOR));
  return BOM + lineas.join('\r\n') + '\r\n';
}

function fechaYHoraLocal(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Un movimiento por fila, del mas antiguo al mas reciente. Importe con signo (gasto negativo).
export function csvMovimientos(
  movimientos: Movimiento[],
  subcategorias: Subcategoria[],
  categorias: Categoria[],
  profiles: Pick<Profile, 'id' | 'nombre'>[]
): string {
  const subPorId = new Map(subcategorias.map((s) => [s.id, s]));
  const catPorId = new Map(categorias.map((c) => [c.id, c.nombre]));
  const nombrePorUsuario = new Map(profiles.map((p) => [p.id, p.nombre]));

  const ordenados = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const filas = ordenados.map((m) => {
    const sub = subPorId.get(m.subcategoria_id);
    const { fecha, hora } = fechaYHoraLocal(m.fecha);
    return [
      fecha,
      hora,
      m.nombre,
      m.importe < 0 ? 'Gasto' : 'Ingreso',
      sub ? catPorId.get(sub.categoria_id) ?? '' : '',
      sub?.nombre ?? '',
      m.importe,
      nombrePorUsuario.get(m.usuario_id) ?? '',
      m.visibilidad === 'compartido' ? 'Compartido' : 'Privado',
      m.nota ?? '',
    ];
  });

  return aCsv(
    ['Fecha', 'Hora', 'Nombre', 'Tipo', 'Categoría', 'Subcategoría', 'Importe (€)', 'Usuario', 'Visibilidad', 'Nota'],
    filas
  );
}

// Una fila por dia y una columna por activo (su valor ese dia), mas el total del dia. Celda
// vacia si ese activo no tenia valor ese dia (aun no comprado, o ya vendido).
export function csvPatrimonio({ activos, filas }: ValoresDiariosPatrimonio): string {
  const cabecera = [
    'Fecha',
    ...activos.map((a) => `${a.nombre}${a.ticker ? ` [${a.ticker}]` : ''} (${ETIQUETA_TIPO[a.tipo]})`),
    'Total (€)',
  ];
  const cuerpo = filas.map(({ fecha, valores }) => {
    const total = activos.reduce((s, a) => s + Math.round((valores[a.id] ?? 0) * 100), 0) / 100;
    return [fecha, ...activos.map((a) => valores[a.id]), total];
  });
  return aCsv(cabecera, cuerpo);
}
