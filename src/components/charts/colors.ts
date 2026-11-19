// Tokens de color compartidos por formulario, listas y graficos (seccion 10 de REQUIREMENTS.md):
// rojo = gasto/negativo, verde = ingreso/positivo, en toda la app de forma consistente. Los
// valores reales viven en index.css (--bad / --ok), con su version para tema claro y oscuro.

export const COLOR_GAIN = 'var(--ok)';
export const COLOR_LOSS = 'var(--bad)';

export function colorPorSigno(importe: number): string {
  return importe < 0 ? COLOR_LOSS : COLOR_GAIN;
}

export function claseColorPorSigno(importe: number): string {
  return importe < 0 ? 'text-bad' : 'text-ok';
}
