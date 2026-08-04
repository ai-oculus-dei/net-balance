import { useCallback, useEffect, useState } from 'react';
import {
  actualizarGastoRecurrente,
  borrarGastoRecurrente,
  crearGastoRecurrente,
  fetchGastosRecurrentes,
  type NuevoGastoRecurrente,
} from '../lib/supabase/queries/recurrentes';
import type { GastoRecurrente } from '../lib/supabase/database.types';

export function useGastosRecurrentes() {
  const [recurrentes, setRecurrentes] = useState<GastoRecurrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchGastosRecurrentes()
      .then(setRecurrentes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function crear(gasto: NuevoGastoRecurrente) {
    await crearGastoRecurrente(gasto);
    await recargar();
  }

  async function actualizar(id: string, cambios: Partial<GastoRecurrente>) {
    await actualizarGastoRecurrente(id, cambios);
    await recargar();
  }

  async function borrar(id: string) {
    await borrarGastoRecurrente(id);
    await recargar();
  }

  return { recurrentes, loading, error, crear, actualizar, borrar, recargar };
}
