// Color fijo de cada categoria (solo presentacion): el mismo en las listas de movimientos, en el
// desglose por categoria y en cualquier leyenda. Sale de la paleta de tokens de index.css
// (cian, violeta, lima, ambar, rosa, azul y naranja de semaforo) mas el verde de "ingreso" para
// Finanzas, que es donde viven los ingresos (salario, extras...).
const COLOR_CATEGORIA: Record<string, string> = {
  Vivienda: 'var(--violet)',
  Transporte: 'var(--sem-blue)',
  Alimentación: 'var(--amber)',
  Salud: 'var(--sem-orange)',
  Deporte: 'var(--lime)',
  Ocio: 'var(--cyan)',
  Compras: 'var(--rose)',
  Finanzas: 'var(--ok)',
};

const CATEGORIA_DE_SUBCATEGORIA: Record<string, string> = {};
const SUBCATEGORIAS: Record<string, string[]> = {
  Vivienda: ['Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Limpieza', 'Línea Móvil', 'Facturas'],
  Transporte: ['Letra Coche', 'Combustible', 'Mantenimiento', 'Seguro Coche', 'TTP', 'Taxi/Uber', 'Parking', 'Peaje'],
  Alimentación: ['Supermercado', 'Expendedora', 'Chino', 'Comida a Domicilio', 'Alcohol', 'Refresco', 'Café', 'Restaurantes'],
  Salud: ['Seguro Médico', 'Farmacia', 'Peluquería', 'Higiene', 'Dentista', 'Fisioterapia'],
  Deporte: ['Gimnasio', 'Running', 'Material Deportivo', 'Clases de Padel', 'Partido Padel', 'Crossfit'],
  Ocio: ['Viajes', 'Cines', 'Conciertos', 'Espectáculos', 'Actividades', 'Suscripciones', 'Videojuegos', 'Apuestas/Lotería', 'Libros', 'Discotecas'],
  Compras: ['Ropa', 'Electrónica', 'Muebles', 'Decoración', 'Regalos', 'Juguetes'],
  Finanzas: ['Inversiones', 'Efectivo', 'Ahorro', 'Impuestos', 'Salario', 'Paga Extra', 'Variable', 'Beneficios', 'Ingreso Extra'],
};
for (const [categoria, subs] of Object.entries(SUBCATEGORIAS)) {
  for (const s of subs) CATEGORIA_DE_SUBCATEGORIA[s] = categoria;
}

const COLOR_POR_DEFECTO = 'var(--muted)';

export function colorDeCategoria(nombreCategoria: string | undefined): string {
  return (nombreCategoria && COLOR_CATEGORIA[nombreCategoria]) || COLOR_POR_DEFECTO;
}

export function colorDeSubcategoria(nombreSubcategoria: string | undefined): string {
  if (!nombreSubcategoria) return COLOR_POR_DEFECTO;
  return colorDeCategoria(CATEGORIA_DE_SUBCATEGORIA[nombreSubcategoria]);
}
