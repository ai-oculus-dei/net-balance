import { useCallback, useEffect, useState } from 'react';
import { fetchAnclasPeriodo } from '../lib/supabase/queries/movimientos';
import { onMovimientosChanged } from '../lib/events/movimientosBus';
import { useAuth } from '../lib/auth/useAuth';
import type { AnclaPeriodo } from '../lib/finance/periodos';

// Fechas de Salario marcadas como "primer dia del mes" del usuario en sesion — definen su
// calendario personal de periodos de pago (ver src/lib/finance/periodos.ts). Se refresca
// tambien cuando el alta rapida global (AppShell) crea/edita/borra un movimiento en otra
// pantalla, igual que useMovimientos.
export function useAnclasPeriodo() {
  const { session } = useAuth();
  const usuarioId = session?.user.id ?? null;
  const [anclas, setAnclas] = useState<AnclaPeriodo[]>([]);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(() => {
    if (!usuarioId) {
      setAnclas([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetchAnclasPeriodo(usuarioId)
      .then(setAnclas)
      .finally(() => setLoading(false));
  }, [usuarioId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onMovimientosChanged(recargar), [recargar]);

  return { anclas, loading };
}
