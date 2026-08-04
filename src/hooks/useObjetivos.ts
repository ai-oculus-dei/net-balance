import { useCallback, useEffect, useState } from 'react';
import {
  actualizarObjetivo,
  borrarObjetivo,
  crearObjetivo,
  fetchObjetivos,
  type NuevoObjetivo,
} from '../lib/supabase/queries/objetivos';
import type { ObjetivoAhorro } from '../lib/supabase/database.types';
import { emitObjetivosChanged, onObjetivosChanged } from '../lib/events/objetivosBus';

export function useObjetivos() {
  const [objetivos, setObjetivos] = useState<ObjetivoAhorro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchObjetivos()
      .then(setObjetivos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Se refresca tambien cuando otra pantalla (p.ej. el alta rapida global de AppShell) crea
  // una aportacion a un objetivo, cambiando su "acumulado".
  useEffect(() => onObjetivosChanged(recargar), [recargar]);

  async function crear(objetivo: NuevoObjetivo) {
    await crearObjetivo(objetivo);
    await recargar();
    emitObjetivosChanged();
  }

  async function actualizar(id: string, cambios: Partial<ObjetivoAhorro>) {
    await actualizarObjetivo(id, cambios);
    await recargar();
    emitObjetivosChanged();
  }

  async function borrar(id: string) {
    await borrarObjetivo(id);
    await recargar();
    emitObjetivosChanged();
  }

  return { objetivos, loading, error, crear, actualizar, borrar, recargar };
}
