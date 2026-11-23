import { useContext } from 'react';
import { PreferenciasContext, type PreferenciasContextValue } from './PreferenciasProvider';

export function usePreferencias(): PreferenciasContextValue {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) throw new Error('usePreferencias debe usarse dentro de PreferenciasProvider');
  return ctx;
}
