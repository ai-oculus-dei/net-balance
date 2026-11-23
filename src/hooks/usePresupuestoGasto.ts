import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  borrarPresupuestoGasto,
  fetchPresupuestoGasto,
  guardarPresupuestoGasto,
} from '../lib/supabase/queries/presupuestoGasto';
import { emitPresupuestoGastoChanged, onPresupuestoGastoChanged } from '../lib/events/presupuestoGastoBus';
import { presupuestoPorDefecto, type LineaPresupuesto } from '../lib/finance/presupuestoGasto';
import { useAuth } from '../lib/auth/useAuth';
import { useTaxonomia } from './useTaxonomia';

// Objetivos de gasto del usuario; si no ha guardado nunca, los valores por defecto.
export function usePresupuestoGasto() {
  const { session } = useAuth();
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();
  const [guardadas, setGuardadas] = useState<LineaPresupuesto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `loading` solo en la primera carga (ver useObjetivosCartera: evita saltos de scroll).
  const recargar = useCallback(() => {
    setError(null);
    return fetchPresupuestoGasto()
      .then(setGuardadas)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => onPresupuestoGastoChanged(recargar), [recargar]);

  const porDefecto = useMemo(() => presupuestoPorDefecto(categorias, subcategorias), [categorias, subcategorias]);
  const esPorDefecto = guardadas === null;
  const lineas = guardadas ?? porDefecto;

  async function guardar(nuevas: LineaPresupuesto[]) {
    if (!session) return;
    await guardarPresupuestoGasto(session.user.id, nuevas);
    emitPresupuestoGastoChanged();
  }

  async function restablecer() {
    if (!session) return;
    await borrarPresupuestoGasto(session.user.id);
    emitPresupuestoGastoChanged();
  }

  return {
    lineas,
    esPorDefecto,
    categorias,
    subcategorias,
    loading: loading || loadingTaxonomia,
    error,
    guardar,
    restablecer,
  };
}
