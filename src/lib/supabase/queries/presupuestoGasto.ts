import { supabase } from '../client';
import { lineasDesdeJson, type LineaPresupuesto } from '../../finance/presupuestoGasto';

// null = el usuario todavia no ha guardado nada (se usan los valores por defecto).
export async function fetchPresupuestoGasto(): Promise<LineaPresupuesto[] | null> {
  const { data, error } = await supabase.from('presupuesto_gasto').select('lineas').maybeSingle();
  if (error) throw error;
  return data ? lineasDesdeJson(data.lineas) : null;
}

export async function guardarPresupuestoGasto(usuarioId: string, lineas: LineaPresupuesto[]): Promise<void> {
  const { error } = await supabase
    .from('presupuesto_gasto')
    .upsert({ usuario_id: usuarioId, lineas }, { onConflict: 'usuario_id' });
  if (error) throw error;
}

// Vuelve a los valores por defecto.
export async function borrarPresupuestoGasto(usuarioId: string): Promise<void> {
  const { error } = await supabase.from('presupuesto_gasto').delete().eq('usuario_id', usuarioId);
  if (error) throw error;
}
