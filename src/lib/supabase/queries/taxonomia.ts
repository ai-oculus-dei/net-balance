import { supabase } from '../client';
import type { Categoria, Subcategoria } from '../database.types';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('id');
  if (error) throw error;
  return data;
}

export async function fetchSubcategorias(): Promise<Subcategoria[]> {
  const { data, error } = await supabase.from('subcategorias').select('*').order('id');
  if (error) throw error;
  return data;
}

// Unica columna de la taxonomia editable desde la app (ver migracion 0026).
export async function actualizarClaseGasto(subcategoriaId: number, clase: 'fijo' | 'variable'): Promise<void> {
  const { error } = await supabase.from('subcategorias').update({ clase_gasto: clase }).eq('id', subcategoriaId);
  if (error) throw error;
}
