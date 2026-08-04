// Objetivo acumulativo con modo de aportacion "automatico" (seccion 7a):
// el sistema calcula el % de ingreso real necesario cada mes para alcanzar la meta
// en la fecha marcada, repartiendo lo que falta entre los meses restantes.

export interface ObjetivoAutomatico {
  meta: number;
  acumulado: number;
  fechaObjetivo: Date;
}

function mesesRestantes(fechaObjetivo: Date, hoy: Date): number {
  const meses =
    (fechaObjetivo.getFullYear() - hoy.getFullYear()) * 12 + (fechaObjetivo.getMonth() - hoy.getMonth());
  return Math.max(meses, 1); // minimo 1 mes: si la fecha ya paso o es el mes actual, aporta todo lo que falta ya
}

export function calcularAportacionAutomatica(objetivo: ObjetivoAutomatico, hoy: Date = new Date()): number {
  const restante = objetivo.meta - objetivo.acumulado;
  if (restante <= 0) return 0;
  const meses = mesesRestantes(objetivo.fechaObjetivo, hoy);
  return Math.round((restante / meses) * 100) / 100;
}
