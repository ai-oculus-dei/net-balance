import { useCallback, useEffect, useState } from 'react';
import { fetchPatrimonioHistorico } from '../lib/supabase/queries/patrimonio';
import type { PatrimonioHistorico } from '../lib/supabase/database.types';
import { onPatrimonioChanged } from '../lib/events/patrimonioBus';

// Solo lectura: patrimonio_historico lo escribe unicamente el RPC generar_snapshot_patrimonio
// (ver 0009_patrimonio.sql), nunca el cliente directamente.
export function usePatrimonioHistorico() {
  const [historico, setHistorico] = useState<PatrimonioHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPatrimonioHistorico()
      .then(setHistorico)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onPatrimonioChanged(recargar), [recargar]);

  return { historico, loading, error, recargar };
}
