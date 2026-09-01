import { useCallback, useEffect, useState } from 'react';
import { fetchAnclasPeriodo } from '../lib/supabase/queries/movimientos';
import { onMovimientosChanged } from '../lib/events/movimientosBus';
import { useAuth } from '../lib/auth/useAuth';
import type { AnclaPeriodo } from '../lib/finance/periodos';

// Fechas de Salario marcadas como "primer dia del mes" de un usuario — definen su calendario
// personal de periodos de pago (ver src/lib/finance/periodos.ts). Por defecto, el usuario en
// sesion; se puede pasar otro id explicitamente (p.ej. en el formulario de alta, cuando se
// registra un movimiento a nombre del otro usuario y hace falta comprobar SU calendario, no el
// de quien esta escribiendo). Se refresca tambien cuando el alta rapida global (AppShell)
// crea/edita/borra un movimiento en otra pantalla, igual que useMovimientos.
export function useAnclasPeriodo(usuarioIdOverride?: string) {
  const { session } = useAuth();
  const usuarioId = usuarioIdOverride ?? session?.user.id ?? null;
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
