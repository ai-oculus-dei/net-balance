import type { RangoFechas } from '../supabase/queries/movimientos';

// OJO: nunca usar `d.toISOString().slice(0, 10)` aqui. `d` se construye con el constructor
// local de Date (medianoche en la zona horaria del usuario), y toISOString() lo convierte a
// UTC — en una zona por delante de UTC (España, UTC+1/+2) eso resta horas y empuja la fecha
// al dia anterior. El limite superior de "rango del mes" (medianoche del dia 1 del mes
// siguiente) se corria asi al ultimo dia del mes actual, y los movimientos de ese ultimo dia
// quedaban fuera de su mes y se colaban en el mes siguiente. Se formatea con los getters
// locales, sin pasar por UTC.
export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function rangoDelMes(fecha: Date = new Date()): RangoFechas {
  const desde = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const hasta = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
  return { desde: toIsoDate(desde), hasta: toIsoDate(hasta) };
}

export function rangoUltimosMeses(cantidadMeses: number, fecha: Date = new Date()): RangoFechas {
  const desde = new Date(fecha.getFullYear(), fecha.getMonth() - (cantidadMeses - 1), 1);
  const hasta = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
  return { desde: toIsoDate(desde), hasta: toIsoDate(hasta) };
}

// Convierte el valor de un <input type="month"> ("YYYY-MM") al primer dia de ese mes.
export function parseMes(mesTexto: string): Date {
  const [anio, mes] = mesTexto.split('-').map(Number);
  return new Date(anio, mes - 1, 1);
}

export function formatearMes(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`;
}

// Rango [primer dia de desdeMes, primer dia del mes siguiente a hastaMes) — limite superior
// exclusivo, igual que el resto de rangos de esta app.
export function rangoEntreMeses(desdeMes: string, hastaMes: string): RangoFechas {
  const desde = parseMes(desdeMes);
  const hastaInicioMes = parseMes(hastaMes);
  const hasta = new Date(hastaInicioMes.getFullYear(), hastaInicioMes.getMonth() + 1, 1);
  return { desde: toIsoDate(desde), hasta: toIsoDate(hasta) };
}
