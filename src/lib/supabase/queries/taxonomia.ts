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
