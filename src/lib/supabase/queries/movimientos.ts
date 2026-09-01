import { supabase } from '../client';
import type { Movimiento } from '../database.types';

export interface RangoFechas {
  desde: string; // ISO date inclusive
  hasta: string; // ISO date exclusive
}

export async function fetchMovimientos(rango: RangoFechas): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .gte('fecha', rango.desde)
    .lt('fecha', rango.hasta)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

// Una "ancla": la fecha de un movimiento de Salario marcado con "Hacer primer dia del mes" —
// define el inicio de un periodo personal (ver src/lib/finance/periodos.ts).
export interface AnclaPeriodo {
  fecha: string;
}

export async function fetchAnclasPeriodo(usuarioId: string): Promise<AnclaPeriodo[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('fecha')
    .eq('usuario_id', usuarioId)
    .eq('es_primer_dia_mes', true)
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data;
}

export type NuevoMovimiento = Omit<Movimiento, 'id' | 'created_at' | 'updated_at'>;

export async function crearMovimiento(movimiento: NuevoMovimiento): Promise<Movimiento> {
  const { data, error } = await supabase.from('movimientos').insert(movimiento).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarMovimiento(id: string, cambios: Partial<Movimiento>): Promise<Movimiento> {
  const { data, error } = await supabase.from('movimientos').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function borrarMovimiento(id: string): Promise<void> {
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}
