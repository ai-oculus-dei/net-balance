import { useCallback, useEffect, useState } from 'react';
import { fetchPreciosHistoricoActivo } from '../lib/supabase/queries/patrimonio';
import type { PrecioHistoricoActivo } from '../lib/supabase/database.types';
import { onPatrimonioChanged } from '../lib/events/patrimonioBus';

// Solo lectura: precios_historico_activo lo escribe unicamente la Edge Function
// actualizar-precios-patrimonio (service_role), nunca el cliente.
export function usePreciosHistoricoActivo() {
  const [precios, setPrecios] = useState<PrecioHistoricoActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPreciosHistoricoActivo()
      .then(setPrecios)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onPatrimonioChanged(recargar), [recargar]);

  return { precios, loading, error, recargar };
}
