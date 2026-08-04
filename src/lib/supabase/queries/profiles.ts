import { supabase } from '../client';
import type { Profile } from '../database.types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('nombre');
  if (error) throw error;
  return data;
}
