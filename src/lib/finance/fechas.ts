import type { RangoFechas } from '../supabase/queries/movimientos';
import type { Movimiento } from '../supabase/database.types';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

export interface PuntoMensual {
  mes: string;
  ingresos: number;
  gastos: number;
}

export function agruparPorMes(movimientos: Movimiento[], cantidadMeses: number, fecha: Date = new Date()): PuntoMensual[] {
  const puntos: PuntoMensual[] = [];
  for (let i = cantidadMeses - 1; i >= 0; i--) {
    const d = new Date(fecha.getFullYear(), fecha.getMonth() - i, 1);
    puntos.push({ mes: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), ingresos: 0, gastos: 0 });
  }

  for (const m of movimientos) {
    const fechaMov = new Date(m.fecha);
    const diffMeses = (fecha.getFullYear() - fechaMov.getFullYear()) * 12 + (fecha.getMonth() - fechaMov.getMonth());
    const indice = cantidadMeses - 1 - diffMeses;
    if (indice < 0 || indice >= puntos.length) continue;
    if (m.importe >= 0) puntos[indice].ingresos += m.importe;
    else puntos[indice].gastos += -m.importe;
  }

  return puntos.map((p) => ({ ...p, ingresos: Math.round(p.ingresos * 100) / 100, gastos: Math.round(p.gastos * 100) / 100 }));
}
