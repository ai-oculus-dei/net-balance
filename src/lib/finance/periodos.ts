import type { AnclaPeriodo, RangoFechas } from '../supabase/queries/movimientos';
import { parseMes, rangoDelMes, toIsoDate } from './fechas';

export type { AnclaPeriodo };

// Sin ancla siguiente, el periodo queda abierto: se usa una fecha centinela muy lejana en vez
// de estimar un final. Una nomina tardia no debe recortar movimientos reales por error.
const FECHA_SIN_LIMITE = '9999-12-31';

function anclasOrdenadas(anclas: AnclaPeriodo[]): AnclaPeriodo[] {
  return [...anclas].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Etiqueta (year, month 0-indexado como Date#getMonth) del periodo que arranca en esta ancla:
// el mes de calendario siguiente al mes en que cae la fecha marcada como "primer dia del mes"
// (decidido en el momento de marcar la casilla, sin esperar a la siguiente nomina — ver
// REQUIREMENTS.md, redefinicion de "mes" como periodo de nomina a nomina).
function etiquetaDeAncla(ancla: AnclaPeriodo): { year: number; month: number } {
  const d = new Date(ancla.fecha);
  const month = d.getMonth() + 1;
  return month > 11 ? { year: d.getFullYear() + 1, month: 0 } : { year: d.getFullYear(), month };
}

function rangoDesdeIndice(ordenadas: AnclaPeriodo[], indice: number): RangoFechas {
  const inicio = new Date(ordenadas[indice].fecha);
  const siguiente = ordenadas[indice + 1] ? new Date(ordenadas[indice + 1].fecha) : null;
  return { desde: toIsoDate(inicio), hasta: siguiente ? toIsoDate(siguiente) : FECHA_SIN_LIMITE };
}

// Ultima ancla cuya fecha es anterior o igual a `fecha` (o null si ninguna lo es).
function anclaMasRecienteHasta(ordenadas: AnclaPeriodo[], fecha: Date): AnclaPeriodo | null {
  const fechaIso = toIsoDate(fecha);
  let resultado: AnclaPeriodo | null = null;
  for (const ancla of ordenadas) {
    if (toIsoDate(new Date(ancla.fecha)) <= fechaIso) resultado = ancla;
    else break;
  }
  return resultado;
}

// Fallback de un mes sin ancla propia (rangoDelMes normal), pero recortado para que nunca se
// solape con un periodo real vecino. Sin este recorte, un mes "olvidado" (nomina sin marcar)
// entre dos anclas reales duplicaria esos movimientos: ya estan cubiertos por el periodo de la
// ancla anterior (que, al no haber ancla que lo cierre, sigue abierto y se los "traga" a todos).
function fallbackClippeado(ordenadas: AnclaPeriodo[], fecha: Date): RangoFechas {
  let desdeClip = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  let hastaClip = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);

  const anclaActiva = anclaMasRecienteHasta(ordenadas, desdeClip);
  if (anclaActiva) {
    const indiceActiva = ordenadas.indexOf(anclaActiva);
    const siguienteDeActiva = ordenadas[indiceActiva + 1] ? new Date(ordenadas[indiceActiva + 1].fecha) : null;
    // El periodo de la ancla anterior sigue vigente al empezar este mes: el fallback no puede
    // arrancar el dia 1, ese tramo ya es suyo. Si esa ancla sigue totalmente abierta (sin
    // siguiente todavia), se traga el mes entero.
    if (!siguienteDeActiva || siguienteDeActiva > desdeClip) {
      desdeClip = siguienteDeActiva ?? hastaClip;
    }
  }

  const anclaDentro = ordenadas.find((a) => {
    const f = new Date(a.fecha);
    return f >= desdeClip && f < hastaClip;
  });
  if (anclaDentro) hastaClip = new Date(anclaDentro.fecha);

  const hastaFinal = desdeClip >= hastaClip ? desdeClip : hastaClip;
  return { desde: toIsoDate(desdeClip), hasta: toIsoDate(hastaFinal) };
}

// Resuelve el rango de fechas del mes de calendario que contiene `fecha` (solo se usan su año
// y mes, igual que rangoDelMes): busca la ancla del usuario cuya etiqueta coincide con ese mes.
// Si ninguna ancla lo define (datos historicos, o la casilla no se marco ese mes), cae al mes
// de calendario normal — recortado para no solaparse con un periodo real vecino.
export function resolverRangoMes(anclas: AnclaPeriodo[], fecha: Date): RangoFechas {
  const ordenadas = anclasOrdenadas(anclas);
  const indice = ordenadas.findIndex((a) => {
    const et = etiquetaDeAncla(a);
    return et.year === fecha.getFullYear() && et.month === fecha.getMonth();
  });
  return indice === -1 ? fallbackClippeado(ordenadas, fecha) : rangoDesdeIndice(ordenadas, indice);
}

// Resuelve el periodo que realmente contiene una fecha concreta (normalmente "hoy"): la ultima
// ancla anterior o igual a esa fecha, hasta la siguiente ancla cronologica. Distinto de
// resolverRangoMes: cerca de fin de mes, "hoy" puede caer ya en el periodo cuya etiqueta es el
// mes siguiente, si esa nomina ya se marco — por eso el Dashboard (que siempre muestra "hoy",
// no un mes elegido) usa esta funcion en vez de resolverRangoMes.
export function resolverPeriodoActual(anclas: AnclaPeriodo[], hoy: Date): RangoFechas {
  const ordenadas = anclasOrdenadas(anclas);
  const ancla = anclaMasRecienteHasta(ordenadas, hoy);
  return ancla ? rangoDesdeIndice(ordenadas, ordenadas.indexOf(ancla)) : rangoDelMes(hoy);
}

// Dia 1 del mes de calendario que etiqueta al periodo que contiene `hoy` — para cabeceras como
// "Este mes: Octubre 25" cuando el periodo real ya ha cruzado al mes siguiente.
export function mesEtiquetaDelPeriodoActual(anclas: AnclaPeriodo[], hoy: Date): Date {
  const ordenadas = anclasOrdenadas(anclas);
  const ancla = anclaMasRecienteHasta(ordenadas, hoy);
  if (!ancla) return hoy;
  const et = etiquetaDeAncla(ancla);
  return new Date(et.year, et.month, 1);
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
