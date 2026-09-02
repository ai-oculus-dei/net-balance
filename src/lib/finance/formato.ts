// Formato de numeros mostrados en toda la app: separador de miles (coma) + decimales fijos —
// p.ej. 1,234.56. Se usa la locale 'en-US' solo como motor de formato (coma miles/punto
// decimales); el resto de la app sigue en español (fechas, textos).
export function formatearImporte(valor: number, decimales = 2): string {
  return valor.toLocaleString('en-US', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

// Para cantidades con precision variable (p.ej. unidades fraccionarias de cripto, hasta 8
// decimales) donde forzar decimales fijos rellenaria de ceros sin sentido — mismo separador de
// miles, pero sin decimales de mas si el valor no los tiene.
export function formatearCantidad(valor: number, maxDecimales = 8): string {
  return valor.toLocaleString('en-US', { maximumFractionDigits: maxDecimales });
}

// Igual que formatearCantidad, pero TRUNCA en vez de redondear — para filas estrechas donde
// mostrar el valor redondeado podria sugerir una precision que no es la que se guardo.
export function formatearCantidadTruncada(valor: number, decimales = 4): string {
  const factor = 10 ** decimales;
  const truncado = Math.trunc(valor * factor) / factor;
  return truncado.toLocaleString('en-US', { maximumFractionDigits: decimales });
}

// Formato abreviado en miles (p.ej. 1234.56 -> "1.23k") para cuando no cabe el numero completo.
// Por debajo de 1000 no abrevia (quedaria una fraccion rara, tipo "0.05k"): devuelve el formato
// normal tal cual.
export function formatearImporteCorto(valor: number): string {
  if (Math.abs(valor) < 1000) return formatearImporte(valor);
  return `${formatearImporte(valor / 1000)}k`;
}
