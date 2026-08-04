import { useCallback, useEffect, useState } from 'react';
import {
  actualizarObjetivo,
  borrarObjetivo,
  crearObjetivo,
  fetchObjetivos,
  type NuevoObjetivo,
} from '../lib/supabase/queries/objetivos';
import type { ObjetivoAhorro } from '../lib/supabase/database.types';

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

  async function crear(objetivo: NuevoObjetivo) {
    await crearObjetivo(objetivo);
    await recargar();
  }

  async function actualizar(id: string, cambios: Partial<ObjetivoAhorro>) {
    await actualizarObjetivo(id, cambios);
    await recargar();
  }

  async function borrar(id: string) {
    await borrarObjetivo(id);
    await recargar();
  }

  return { objetivos, loading, error, crear, actualizar, borrar, recargar };
}
