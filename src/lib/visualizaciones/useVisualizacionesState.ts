import { useContext } from 'react';
import { VisualizacionesContext } from './VisualizacionesProvider';

export function useVisualizacionesState() {
  const ctx = useContext(VisualizacionesContext);
  if (!ctx) throw new Error('useVisualizacionesState debe usarse dentro de <VisualizacionesProvider>');
  return ctx;
}
