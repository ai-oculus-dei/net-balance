import { supabase } from '../client';
import type { PatrimonioHistorico, PosicionPatrimonio } from '../database.types';

export async function fetchPosicionesPatrimonio(): Promise<PosicionPatrimonio[]> {
  const { data, error } = await supabase
    .from('posiciones_patrimonio')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export type NuevaPosicionPatrimonio = Omit<PosicionPatrimonio, 'id' | 'created_at' | 'updated_at' | 'activa'>;

export async function crearPosicionPatrimonio(posicion: NuevaPosicionPatrimonio): Promise<PosicionPatrimonio> {
  const { data, error } = await supabase.from('posiciones_patrimonio').insert(posicion).select().single();
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

export async function generarSnapshotPatrimonio(): Promise<void> {
  const { error } = await supabase.rpc('generar_snapshot_patrimonio');
  if (error) throw error;
}
