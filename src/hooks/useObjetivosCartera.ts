import { useCallback, useEffect, useState } from 'react';
import { fetchObjetivosCartera, guardarObjetivoCartera } from '../lib/supabase/queries/objetivosCartera';
import { emitObjetivosCarteraChanged, onObjetivosCarteraChanged } from '../lib/events/objetivosCarteraBus';
import { useAuth } from '../lib/auth/useAuth';
import type { ObjetivoCartera } from '../lib/finance/objetivosCartera';

export function useObjetivosCartera() {
  const { session } = useAuth();
  const [objetivos, setObjetivos] = useState<ObjetivoCartera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `loading` solo es true en la PRIMERA carga. En las recargas (p.ej. tras guardar un objetivo)
  // se siguen mostrando los datos anteriores hasta que llegan los nuevos: si se cambiaban por un
  // "Cargando", la tarjeta de reparto y el aviso de arriba encogian la pagina justo mientras se
  // cerraba el formulario, y al restaurar el scroll la pagina quedaba mucho mas abajo.
  const recargar = useCallback(() => {
    setError(null);
    return fetchObjetivosCartera()
      .then(setObjetivos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onObjetivosCarteraChanged(recargar), [recargar]);

  async function guardar(objetivo: ObjetivoCartera) {
    if (!session) return;
    await guardarObjetivoCartera(session.user.id, objetivo);
    emitObjetivosCarteraChanged();
  }

  return { objetivos, loading, error, guardar };
}
