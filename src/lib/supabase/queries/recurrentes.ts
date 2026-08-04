import { supabase } from '../client';
import type { GastoRecurrente } from '../database.types';

export async function fetchGastosRecurrentes(): Promise<GastoRecurrente[]> {
  const { data, error } = await supabase
    .from('gastos_recurrentes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export type NuevoGastoRecurrente = Omit<GastoRecurrente, 'id' | 'created_at' | 'updated_at'>;

export async function crearGastoRecurrente(gasto: NuevoGastoRecurrente): Promise<GastoRecurrente> {
  const { data, error } = await supabase.from('gastos_recurrentes').insert(gasto).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarGastoRecurrente(
  id: string,
  cambios: Partial<GastoRecurrente>
): Promise<GastoRecurrente> {
  const { data, error } = await supabase.from('gastos_recurrentes').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function borrarGastoRecurrente(id: string): Promise<void> {
  const { error } = await supabase.from('gastos_recurrentes').delete().eq('id', id);
  if (error) throw error;
}
