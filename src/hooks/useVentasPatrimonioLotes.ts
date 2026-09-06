import { useCallback, useEffect, useState } from 'react';
import { fetchVentasPatrimonioLotes } from '../lib/supabase/queries/ventas';
import type { VentaPatrimonioLote } from '../lib/supabase/database.types';
import { onPatrimonioChanged } from '../lib/events/patrimonioBus';

// Solo lectura: ventas_patrimonio_lotes lo escribe unicamente el RPC registrar_venta_patrimonio.
export function useVentasPatrimonioLotes() {
  const [ventasLotes, setVentasLotes] = useState<VentaPatrimonioLote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchVentasPatrimonioLotes()
      .then(setVentasLotes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onPatrimonioChanged(recargar), [recargar]);

  return { ventasLotes, loading, error, recargar };
}
