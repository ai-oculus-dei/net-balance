import { supabase } from '../client';
import type { ObjetivoCarteraFila } from '../database.types';
import type { ObjetivoCartera } from '../../finance/objetivosCartera';

function desdeFila(f: ObjetivoCarteraFila): ObjetivoCartera {
  // numeric llega como string desde PostgREST en algunos casos: se normaliza a number.
  return { clave: f.clave, etiqueta: f.etiqueta, objetivoPct: f.objetivo_pct === null ? null : Number(f.objetivo_pct) };
}

// Solo las del usuario en sesion (RLS).
export async function fetchObjetivosCartera(): Promise<ObjetivoCartera[]> {
  const { data, error } = await supabase.from('objetivos_cartera').select('*');
  if (error) throw error;
  return (data as ObjetivoCarteraFila[]).map(desdeFila);
}

// Crea o actualiza; si no queda ni etiqueta ni objetivo, borra la fila (sin objetivo = sin fila).
export async function guardarObjetivoCartera(usuarioId: string, objetivo: ObjetivoCartera): Promise<void> {
  if (objetivo.etiqueta === null && objetivo.objetivoPct === null) {
    const { error } = await supabase.from('objetivos_cartera').delete().eq('usuario_id', usuarioId).eq('clave', objetivo.clave);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('objetivos_cartera').upsert(
    { usuario_id: usuarioId, clave: objetivo.clave, etiqueta: objetivo.etiqueta, objetivo_pct: objetivo.objetivoPct },
    { onConflict: 'usuario_id,clave' }
  );
  if (error) throw error;
}
