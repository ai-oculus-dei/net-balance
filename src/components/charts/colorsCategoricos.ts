// Paleta categorica de orden fijo (nunca se reordena ni se genera un color nuevo): distingue
// hasta 8 "lineas" a la vez tanto en el grafico temporal como en la tarta, con el mismo color
// identificando la misma linea en ambos. Son los acentos neon del sistema visual (mismos valores
// que los tokens --cyan, --violet, --lime, --amber, --rose, --sem-blue, --sem-orange y --ok de
// index.css), en su variante para tema oscuro y para tema claro. Se dan en hex y no como
// var(--x) porque Recharts los usa tambien dentro de atributos SVG.
const PALETA_CLARO = ['#0891b2', '#7c3aed', '#65a30d', '#d97706', '#e11d48', '#0284c7', '#ea580c', '#059669'];
const PALETA_OSCURO = ['#22d3ee', '#a78bfa', '#a3e635', '#fbbf24', '#fb7185', '#38bdf8', '#fb923c', '#34d399'];

export const MAX_LINEAS = PALETA_CLARO.length;

export function colorCategorico(colorIndex: number, theme: 'light' | 'dark'): string {
  const paleta = theme === 'dark' ? PALETA_OSCURO : PALETA_CLARO;
  return paleta[colorIndex % paleta.length];
}
