// Supabase/PostgREST no devuelve mas de un limite de filas por consulta (1000 por defecto) si no
// se pagina explicitamente con .range() — por encima de ese limite, el resto de filas se
// descartan en silencio, sin error. Tablas que crecen sin tope (patrimonio_historico,
// precios_historico_activo...) necesitan esto para no perder datos antiguos sin avisar.
const TAMANO_PAGINA = 1000;

export async function fetchTodasLasFilas<T>(
  pedirPagina: (desde: number, hasta: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const todas: T[] = [];
  let desde = 0;
  for (;;) {
    const { data, error } = await pedirPagina(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    todas.push(...data);
    desde += data.length;
  }
  return todas;
}
