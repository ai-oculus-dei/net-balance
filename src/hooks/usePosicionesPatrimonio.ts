import { useCallback, useEffect, useState } from 'react';
import {
  actualizarPosicionPatrimonio,
  archivarPosicionPatrimonio,
  crearPosicionPatrimonio,
  fetchPosicionesPatrimonio,
  type NuevaPosicionPatrimonio,
} from '../lib/supabase/queries/patrimonio';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';
import { emitPatrimonioChanged, onPatrimonioChanged } from '../lib/events/patrimonioBus';

export function usePosicionesPatrimonio() {
  const [posiciones, setPosiciones] = useState<PosicionPatrimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPosicionesPatrimonio()
      .then(setPosiciones)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Se refresca tambien cuando otra pantalla (p.ej. el alta rapida global de AppShell, o el
  // snapshot diario al arrancar la app) cambia posiciones.
  useEffect(() => onPatrimonioChanged(recargar), [recargar]);

  async function crear(posicion: NuevaPosicionPatrimonio) {
    await crearPosicionPatrimonio(posicion);
    await recargar();
    emitPatrimonioChanged();
  }

  async function actualizar(id: string, cambios: Partial<PosicionPatrimonio>) {
    await actualizarPosicionPatrimonio(id, cambios);
    await recargar();
    emitPatrimonioChanged();
  }

  async function archivar(id: string) {
    await archivarPosicionPatrimonio(id);
    await recargar();
    emitPatrimonioChanged();
  }

  return { posiciones, loading, error, crear, actualizar, archivar, recargar };
}
