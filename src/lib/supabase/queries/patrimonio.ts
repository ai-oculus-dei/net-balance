import { supabase } from '../client';
import type {
  PatrimonioHistorico,
  PatrimonioPreciosActualizacion,
  PosicionPatrimonio,
  PrecioHistoricoActivo,
} from '../database.types';

export async function fetchPosicionesPatrimonio(): Promise<PosicionPatrimonio[]> {
  const { data, error } = await supabase
    .from('posiciones_patrimonio')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// error_precio la escribe solo la Edge Function: una posicion nueva nunca ha tenido un intento
// de actualizacion todavia, asi que crearPosicionPatrimonio la fija a null directamente.
// cantidad_original es opcional: si no se manda, el trigger fijar_cantidad_original la iguala a
// `cantidad` (ver 0017_patrimonio_historico_precios.sql) — no hace falta que el cliente la sepa.
export type NuevaPosicionPatrimonio = Omit<
  PosicionPatrimonio,
  'id' | 'created_at' | 'updated_at' | 'activa' | 'error_precio' | 'cantidad_original'
> & { cantidad_original?: number };

export async function crearPosicionPatrimonio(posicion: NuevaPosicionPatrimonio): Promise<PosicionPatrimonio> {
  const { data, error } = await supabase
    .from('posiciones_patrimonio')
    .insert({ ...posicion, error_precio: null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarPosicionPatrimonio(
  id: string,
  cambios: Partial<PosicionPatrimonio>
): Promise<PosicionPatrimonio> {
  const { data, error } = await supabase.from('posiciones_patrimonio').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// "Borrar" una posicion la archiva (activa = false) en vez de eliminarla, para conservar su
// historico ya generado (ver 0009_patrimonio.sql).
export async function archivarPosicionPatrimonio(id: string): Promise<PosicionPatrimonio> {
  return actualizarPosicionPatrimonio(id, { activa: false });
}

export async function fetchPatrimonioHistorico(): Promise<PatrimonioHistorico[]> {
  const { data, error } = await supabase.from('patrimonio_historico').select('*').order('fecha', { ascending: true });
  if (error) throw error;
  return data;
}

// Sin usuario_id (el precio de mercado se comparte, ver 0017_patrimonio_historico_precios.sql).
export async function fetchPreciosHistoricoActivo(): Promise<PrecioHistoricoActivo[]> {
  const { data, error } = await supabase.from('precios_historico_activo').select('*').order('fecha', { ascending: true });
  if (error) throw error;
  return data;
}

export async function generarSnapshotPatrimonio(): Promise<void> {
  const { error } = await supabase.rpc('generar_snapshot_patrimonio');
  if (error) throw error;
}

// null si el cron todavia no se ha ejecutado nunca (tabla vacia).
export async function fetchUltimaActualizacionPrecios(): Promise<string | null> {
  const { data, error } = await supabase.from('patrimonio_precios_actualizacion').select('actualizado_en').maybeSingle();
  if (error) throw error;
  return (data as Pick<PatrimonioPreciosActualizacion, 'actualizado_en'> | null)?.actualizado_en ?? null;
}
