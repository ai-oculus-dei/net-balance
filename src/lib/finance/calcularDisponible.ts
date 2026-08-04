// Logica pura (sin React ni Supabase) del calculo de "disponible" — seccion 8 de REQUIREMENTS.md.
//
// Disponible = Ingreso real del mes - Gastos fijos del mes - Aportaciones a objetivos del mes
//
// Si el resultado seria negativo, se reduce proporcionalmente (a prorrata) la aportacion de
// cada objetivo activo hasta que el disponible sea >= 0.

export interface AportacionDeseada {
  objetivoId: string;
  importe: number;
}

export interface ResultadoDisponible {
  disponible: number;
  aportacionesAplicadas: AportacionDeseada[];
}

function round2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularDisponible(
  ingresoReal: number,
  gastosFijos: number,
  aportacionesDeseadas: AportacionDeseada[]
): ResultadoDisponible {
  const totalDeseado = aportacionesDeseadas.reduce((suma, a) => suma + a.importe, 0);
  const disponibleAntesDeAportar = round2(ingresoReal - gastosFijos);
  const disponibleTrasAportar = round2(disponibleAntesDeAportar - totalDeseado);

  if (disponibleTrasAportar >= 0) {
    return { disponible: disponibleTrasAportar, aportacionesAplicadas: aportacionesDeseadas };
  }

  if (disponibleAntesDeAportar <= 0 || totalDeseado <= 0) {
    // No hay presupuesto ni para gastos fijos, o no habia aportaciones que reducir.
    return {
      disponible: disponibleAntesDeAportar,
      aportacionesAplicadas: aportacionesDeseadas.map((a) => ({ ...a, importe: 0 })),
    };
  }

  const factor = disponibleAntesDeAportar / totalDeseado;
  return {
    disponible: 0,
    aportacionesAplicadas: aportacionesDeseadas.map((a) => ({ ...a, importe: round2(a.importe * factor) })),
  };
}
