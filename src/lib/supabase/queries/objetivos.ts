import { supabase } from '../client';
import type { ObjetivoAhorro } from '../database.types';

export async function fetchObjetivos(): Promise<ObjetivoAhorro[]> {
  const { data, error } = await supabase
    .from('objetivos_ahorro')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export type NuevoObjetivo = Omit<ObjetivoAhorro, 'id' | 'created_at' | 'updated_at' | 'acumulado'>;

export async function crearObjetivo(objetivo: NuevoObjetivo): Promise<ObjetivoAhorro> {
  const { data, error } = await supabase.from('objetivos_ahorro').insert(objetivo).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarObjetivo(id: string, cambios: Partial<ObjetivoAhorro>): Promise<ObjetivoAhorro> {
  const { data, error } = await supabase.from('objetivos_ahorro').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function borrarObjetivo(id: string): Promise<void> {
  const { error } = await supabase.from('objetivos_ahorro').delete().eq('id', id);
  if (error) throw error;
}
