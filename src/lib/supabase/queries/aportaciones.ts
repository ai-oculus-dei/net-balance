import { supabase } from '../client';
import type { AportacionObjetivo } from '../database.types';

export async function fetchAportacionPorMovimiento(movimientoId: string): Promise<AportacionObjetivo | null> {
  const { data, error } = await supabase
    .from('aportaciones_objetivo')
    .select('*')
    .eq('movimiento_id', movimientoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface NuevaAportacion {
  objetivo_id: string;
  movimiento_id: string;
  importe: number;
}

export async function crearAportacion(aportacion: NuevaAportacion): Promise<AportacionObjetivo> {
  const { data, error } = await supabase.from('aportaciones_objetivo').insert(aportacion).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarAportacion(
  id: string,
  cambios: Partial<Pick<AportacionObjetivo, 'objetivo_id' | 'importe'>>
): Promise<AportacionObjetivo> {
  const { data, error } = await supabase.from('aportaciones_objetivo').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function borrarAportacion(id: string): Promise<void> {
  const { error } = await supabase.from('aportaciones_objetivo').delete().eq('id', id);
  if (error) throw error;
}

export interface AsignacionAhorro {
  objetivoId: string;
  importe: number;
}

// Crea, actualiza o borra la aportacion de un movimiento segun lo que haya cambiado en el
// formulario: sin aportacion anterior + nueva -> crear; con anterior + sin nueva -> borrar;
// con ambas -> actualizar (el trigger de la base de datos ajusta "acumulado" en cualquier caso).
export async function sincronizarAportacion(
  movimientoId: string,
  anterior: AportacionObjetivo | null,
  nueva: AsignacionAhorro | null
): Promise<void> {
  if (!nueva) {
    if (anterior) await borrarAportacion(anterior.id);
    return;
  }
  if (anterior) {
    await actualizarAportacion(anterior.id, { objetivo_id: nueva.objetivoId, importe: nueva.importe });
  } else {
    await crearAportacion({ movimiento_id: movimientoId, objetivo_id: nueva.objetivoId, importe: nueva.importe });
  }
}
