// Tokens de color compartidos por formulario, listas y graficos (seccion 10 de REQUIREMENTS.md):
// rojo = gasto/negativo, verde = ingreso/positivo, en toda la app de forma consistente.

export const COLOR_GAIN = '#22c55e';
export const COLOR_LOSS = '#ef4444';

export function colorPorSigno(importe: number): string {
  return importe < 0 ? COLOR_LOSS : COLOR_GAIN;
}

export function claseColorPorSigno(importe: number): string {
  return importe < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-gain)]';
}
