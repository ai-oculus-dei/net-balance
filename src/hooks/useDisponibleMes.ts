import { useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useObjetivos } from './useObjetivos';
import { useTaxonomia } from './useTaxonomia';
import { rangoDelMes } from '../lib/finance/fechas';
import { calcularDisponible, type AportacionDeseada } from '../lib/finance/calcularDisponible';
import { calcularAportacionDeseada } from '../lib/finance/calcularAportacionDeseada';
import { gastosFijosDelMes, indexarSubcategorias, ingresoRealDelMes } from '../lib/finance/taxonomia';

export function useDisponibleMes(fecha: Date = new Date()) {
  const rango = useMemo(() => rangoDelMes(fecha), [fecha]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const { objetivos, loading: loadingObjetivos } = useObjetivos();
  const { subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const resultado = useMemo(() => {
    const subcategoriasPorId = indexarSubcategorias(subcategorias);
    const ingresoReal = ingresoRealDelMes(movimientos, subcategoriasPorId);
    const gastosFijos = gastosFijosDelMes(movimientos);

    const objetivosActivos = objetivos.filter((o) => o.activo);
    const aportacionesDeseadas: AportacionDeseada[] = objetivosActivos.map((o) => ({
      objetivoId: o.id,
      importe: calcularAportacionDeseada(o, ingresoReal, fecha),
    }));

    const { disponible, aportacionesAplicadas } = calcularDisponible(ingresoReal, gastosFijos, aportacionesDeseadas);

    return { ingresoReal, gastosFijos, disponible, aportacionesDeseadas, aportacionesAplicadas, objetivosActivos };
  }, [movimientos, objetivos, subcategorias, fecha]);

  return {
    ...resultado,
    movimientos,
    loading: loadingMovimientos || loadingObjetivos || loadingTaxonomia,
  };
}
