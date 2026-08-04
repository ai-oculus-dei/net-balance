import type { ObjetivoAhorro } from '../supabase/database.types';
import { calcularAportacionAutomatica } from './calcularAportacionAutomatica';

// Aportacion mensual que un objetivo "pide" segun su configuracion (seccion 7), antes de la
// reduccion proporcional por falta de disponible (seccion 8) — es el numero que se muestra en
// Objetivos/Dashboard como "lo que hay que ahorrar este mes", independientemente de si el mes
// da para cubrirlo entero.
export function calcularAportacionDeseada(
  objetivo: Pick<ObjetivoAhorro, 'tipo' | 'modo_aportacion' | 'porcentaje' | 'meta' | 'acumulado' | 'fecha_objetivo'>,
  ingresoReal: number,
  fecha: Date = new Date()
): number {
  if (objetivo.tipo === 'recurrente' || objetivo.modo_aportacion === 'manual') {
    const porcentaje = objetivo.porcentaje ?? 0;
    return Math.round(ingresoReal * (porcentaje / 100) * 100) / 100;
  }
  return calcularAportacionAutomatica({
    meta: objetivo.meta ?? 0,
    acumulado: objetivo.acumulado,
    fechaObjetivo: objetivo.fecha_objetivo ? new Date(objetivo.fecha_objetivo) : fecha,
  });
}
