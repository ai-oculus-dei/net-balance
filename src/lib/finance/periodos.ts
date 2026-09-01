import type { AnclaPeriodo, RangoFechas } from '../supabase/queries/movimientos';
import { parseMes } from './fechas';

export type { AnclaPeriodo };

// Etiqueta (year, month 0-indexado como Date#getMonth) del mes que una ancla marca como su
// inicio: el mes de calendario siguiente al mes en que cae la fecha marcada como "primer dia
// del mes" (decidido en el momento de marcar la casilla, sin esperar a la siguiente nomina).
function etiquetaDeAncla(ancla: AnclaPeriodo): { year: number; month: number } {
  const d = new Date(ancla.fecha);
  const month = d.getMonth() + 1;
  return month > 11 ? { year: d.getFullYear() + 1, month: 0 } : { year: d.getFullYear(), month };
}

// Ancla cuya etiqueta coincide con (year, month), si hay alguna. Con dos anclas para el mismo
// mes (nomina marcada por error dos veces), se usa la mas antigua de forma deterministica.
function anclaConEtiqueta(anclas: AnclaPeriodo[], year: number, month: number): AnclaPeriodo | null {
  const candidatas = anclas.filter((a) => {
    const et = etiquetaDeAncla(a);
    return et.year === year && et.month === month;
  });
  if (candidatas.length === 0) return null;
  return candidatas.reduce((antes, actual) => (actual.fecha < antes.fecha ? actual : antes));
}

// Instante UTC preciso de la medianoche local del dia 1 de (year, month) — a diferencia de
// toIsoDate (fechas.ts, deliberadamente solo fecha, sin hora), aqui necesitamos precision de
// hora para poder comparar contra el instante exacto de una nomina marcada a mitad de dia.
// date.toISOString() sin truncar es seguro: da el instante UTC real de esa medianoche local,
// sin el problema de "restar un dia" que sí tiene truncar a solo fecha tras convertir a UTC.
function medianocheLocalIso(year: number, month: number): string {
  return new Date(year, month, 1).toISOString();
}

// Resuelve el rango exacto (con hora) del mes de calendario (year, month 0-indexado): por
// defecto es el mes de calendario entero (dia 1 a dia 1 del mes siguiente). Si hay una nomina
// marcada como inicio de este mes, su instante exacto sustituye al dia 1 por defecto. Si hay
// una marcada como inicio del mes siguiente, ese mismo instante (excluido) sustituye al cierre
// por defecto: el mes anterior cierra justo antes de esa nomina, con precision de hora, no solo
// de dia — si el salario llega a mitad de dia, el cierre es el instante justo anterior a
// registrar ese ingreso.
export function resolverRangoMes(anclas: AnclaPeriodo[], fecha: Date): RangoFechas {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();
  const siguiente = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const anclaInicio = anclaConEtiqueta(anclas, year, month);
  const anclaCierre = anclaConEtiqueta(anclas, siguiente.year, siguiente.month);

  return {
    desde: anclaInicio ? anclaInicio.fecha : medianocheLocalIso(year, month),
    hasta: anclaCierre ? anclaCierre.fecha : medianocheLocalIso(siguiente.year, siguiente.month),
  };
}

export interface PeriodoResuelto {
  rango: RangoFechas;
  etiqueta: { year: number; month: number };
}

// Resuelve el periodo que realmente contiene un instante concreto (normalmente "ahora mismo"):
// parte del mes de calendario de esa fecha y se corrige un mes hacia atras o hacia adelante si
// una nomina marcada ha desplazado el limite mas alla de ese instante. Distinto de
// resolverRangoMes: cerca de fin de mes, "ahora" puede caer ya en el periodo cuya etiqueta es
// el mes siguiente, si esa nomina ya se marco — por eso el Dashboard (que siempre muestra "hoy",
// no un mes elegido) usa esta funcion en vez de resolverRangoMes directamente.
export function resolverPeriodoActual(anclas: AnclaPeriodo[], hoy: Date): PeriodoResuelto {
  let year = hoy.getFullYear();
  let month = hoy.getMonth();
  const instante = hoy.getTime();

  // Como mucho hace falta un ajuste de un mes en cada direccion en el caso normal; el limite de
  // iteraciones es solo una salvaguarda ante datos inconsistentes, no se espera alcanzarlo.
  for (let intentos = 0; intentos < 24; intentos++) {
    const rango = resolverRangoMes(anclas, new Date(year, month, 1));
    const desdeMs = new Date(rango.desde).getTime();
    const hastaMs = new Date(rango.hasta).getTime();

    if (instante < desdeMs) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      continue;
    }
    if (instante >= hastaMs) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      continue;
    }
    return { rango, etiqueta: { year, month } };
  }

  return { rango: resolverRangoMes(anclas, hoy), etiqueta: { year: hoy.getFullYear(), month: hoy.getMonth() } };
}

// Igual que rangoEntreMeses (fechas.ts) pero resolviendo cada extremo con las anclas del usuario.
export function resolverRangoEntreMeses(anclas: AnclaPeriodo[], desdeMes: string, hastaMes: string): RangoFechas {
  const desde = resolverRangoMes(anclas, parseMes(desdeMes));
  const hasta = resolverRangoMes(anclas, parseMes(hastaMes));
  return { desde: desde.desde, hasta: hasta.hasta };
}

export interface PeriodoConEtiqueta {
  etiquetaCorta: string; // ej. "sept 25", para el eje del grafico de evolucion
  rango: RangoFechas;
}

// Un periodo resuelto por cada mes de calendario entre desdeMes y hastaMes ("YYYY-MM", ambos
// inclusive) — para el bucketing del grafico de evolucion mensual en Visualizaciones.
export function periodosEntre(anclas: AnclaPeriodo[], desdeMes: string, hastaMes: string): PeriodoConEtiqueta[] {
  const desde = parseMes(desdeMes);
  const hasta = parseMes(hastaMes);
  const totalMeses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1;
  const periodos: PeriodoConEtiqueta[] = [];
  for (let i = 0; i < Math.max(totalMeses, 0); i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
    periodos.push({
      etiquetaCorta: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      rango: resolverRangoMes(anclas, d),
    });
  }
  return periodos;
}
