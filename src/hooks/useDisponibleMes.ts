import { useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useObjetivos } from './useObjetivos';
import { useTaxonomia } from './useTaxonomia';
import { rangoDelMes } from '../lib/finance/fechas';
import { calcularDisponible, type AportacionDeseada } from '../lib/finance/calcularDisponible';
import { calcularAportacionAutomatica } from '../lib/finance/calcularAportacionAutomatica';
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
    const aportacionesDeseadas: AportacionDeseada[] = objetivosActivos.map((o) => {
      if (o.tipo === 'recurrente' || o.modo_aportacion === 'manual') {
        const porcentaje = o.porcentaje ?? 0;
        return { objetivoId: o.id, importe: Math.round(ingresoReal * (porcentaje / 100) * 100) / 100 };
      }
      // acumulativo + automatico
      const importe = calcularAportacionAutomatica({
        meta: o.meta ?? 0,
        acumulado: o.acumulado,
        fechaObjetivo: o.fecha_objetivo ? new Date(o.fecha_objetivo) : fecha,
      });
      return { objetivoId: o.id, importe };
    });

    const { disponible, aportacionesAplicadas } = calcularDisponible(ingresoReal, gastosFijos, aportacionesDeseadas);

    return { ingresoReal, gastosFijos, disponible, aportacionesAplicadas, objetivosActivos };
  }, [movimientos, objetivos, subcategorias, fecha]);

  return {
    ...resultado,
    movimientos,
    loading: loadingMovimientos || loadingObjetivos || loadingTaxonomia,
  };
}
