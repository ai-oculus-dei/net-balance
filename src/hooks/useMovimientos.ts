import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Evita que una peticion antigua (p.ej. con un rango provisional, antes de que carguen las
  // anclas del periodo) sobrescriba el resultado de una peticion mas nueva si resuelve despues:
  // solo se aplica la respuesta si sigue siendo la ultima peticion lanzada.
  const idPeticion = useRef(0);

  const recargar = useCallback(() => {
    const miId = ++idPeticion.current;
    setLoading(true);
    setError(null);
    return fetchMovimientos(rango)
      .then((datos) => {
        if (miId !== idPeticion.current) return;
        setMovimientos(datos);
      })
      .catch((e: Error) => {
        if (miId !== idPeticion.current) return;
        setError(e.message);
      })
      .finally(() => {
        if (miId !== idPeticion.current) return;
        setLoading(false);
      });
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
