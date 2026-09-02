import { useEffect, useState } from 'react';
import { fetchUltimaActualizacionPrecios } from '../lib/supabase/queries/patrimonio';

// Solo lectura: patrimonio_precios_actualizacion la escribe unicamente la Edge Function
// actualizar-precios-patrimonio (cron), nunca el cliente.
export function useUltimaActualizacionPrecios() {
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  useEffect(() => {
    fetchUltimaActualizacionPrecios().then(setActualizadoEn).catch(() => setActualizadoEn(null));
  }, []);

  return actualizadoEn;
}
