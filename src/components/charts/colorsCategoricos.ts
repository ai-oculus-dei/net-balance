// Paleta categorica validada (orden fijo, nunca se reordena/genera un color nuevo — ver
// dataviz skill): distingue hasta 8 "lineas" a la vez tanto en el grafico temporal como en la
// tarta, con el mismo color identificando la misma linea en ambos. Pasa los checks de
// contraste/CVD contra las superficies reales de la app (--color-surface claro #ffffff,
// oscuro #14161d) — validado con scripts/validate_palette.js del skill. 8 es el techo real:
// un 9º color generado seria indistinguible de uno de estos bajo daltonismo (no se sube mas).
const PALETA_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const PALETA_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export const MAX_LINEAS = PALETA_CLARO.length;

export function colorCategorico(colorIndex: number, theme: 'light' | 'dark'): string {
  const paleta = theme === 'dark' ? PALETA_OSCURO : PALETA_CLARO;
  return paleta[colorIndex % paleta.length];
}
