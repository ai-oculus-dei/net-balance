import { useCallback, useEffect, useState } from 'react';
import {
  actualizarMovimiento,
  borrarMovimiento,
  crearMovimiento,
  fetchMovimientos,
  type NuevoMovimiento,
  type RangoFechas,
} from '../lib/supabase/queries/movimientos';
import type { Movimiento } from '../lib/supabase/database.types';
import { emitMovimientosChanged, onMovimientosChanged } from '../lib/events/movimientosBus';

export function useMovimientos(rango: RangoFechas) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchMovimientos(rango)
      .then(setMovimientos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rango]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Se refresca tambien cuando otra pantalla (p.ej. el alta rapida global de AppShell) cambia movimientos.
  useEffect(() => onMovimientosChanged(recargar), [recargar]);

  async function crear(movimiento: NuevoMovimiento) {
    await crearMovimiento(movimiento);
    await recargar();
    emitMovimientosChanged();
  }

  async function actualizar(id: string, cambios: Partial<Movimiento>) {
    await actualizarMovimiento(id, cambios);
    await recargar();
    emitMovimientosChanged();
  }

  async function borrar(id: string) {
    await borrarMovimiento(id);
    await recargar();
    emitMovimientosChanged();
  }

  return { movimientos, loading, error, crear, actualizar, borrar, recargar };
}
