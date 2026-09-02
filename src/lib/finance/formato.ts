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
