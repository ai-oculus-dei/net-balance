import { useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useObjetivos } from './useObjetivos';
import { useTaxonomia } from './useTaxonomia';
import { useAnclasPeriodo } from './useAnclasPeriodo';
import { calcularDisponible, type AportacionDeseada } from '../lib/finance/calcularDisponible';
import { calcularAportacionDeseada } from '../lib/finance/calcularAportacionDeseada';
import { gastosFijosDelMes, indexarSubcategorias, ingresoRealDelMes } from '../lib/finance/taxonomia';
import { resolverPeriodoActual } from '../lib/finance/periodos';

export function useDisponibleMes(fecha: Date = new Date()) {
  // Clave estable (año-mes-dia) en vez de la referencia de `fecha`: si quien llama pasa un
  // `new Date()` fresco en cada render (o usa el valor por defecto), esto evita que
  // useMemo/useEffect de abajo detecten un "cambio" en cada render y entren en bucle de
  // recarga infinita. Se incluye el dia (no solo año-mes como antes) porque ahora el rango
  // depende de las anclas de periodo, y cual es "hoy" dentro del mes puede cambiar el periodo
  // resuelto (ver resolverPeriodoActual).
  const claveDia = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
  const { anclas, loading: loadingAnclas } = useAnclasPeriodo();
  const { rango, mesEtiqueta } = useMemo(() => {
    const { rango, etiqueta } = resolverPeriodoActual(anclas, fecha);
    return { rango, mesEtiqueta: new Date(etiqueta.year, etiqueta.month, 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anclas, claveDia]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const { objetivos, loading: loadingObjetivos } = useObjetivos();
  const { subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const resultado = useMemo(() => {
    const subcategoriasPorId = indexarSubcategorias(subcategorias);
    const ingresoReal = ingresoRealDelMes(movimientos, subcategoriasPorId);
    const gastosFijos = gastosFijosDelMes(movimientos, subcategoriasPorId);

    const objetivosActivos = objetivos.filter((o) => o.activo);
    const aportacionesDeseadas: AportacionDeseada[] = objetivosActivos.map((o) => ({
      objetivoId: o.id,
      importe: calcularAportacionDeseada(o, ingresoReal, fecha),
    }));

    const { disponible, aportacionesAplicadas } = calcularDisponible(ingresoReal, gastosFijos, aportacionesDeseadas);

    return { ingresoReal, gastosFijos, disponible, aportacionesDeseadas, aportacionesAplicadas, objetivosActivos };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, objetivos, subcategorias, claveDia]);

  return {
    ...resultado,
    movimientos,
    mesEtiqueta,
    loading: loadingMovimientos || loadingObjetivos || loadingTaxonomia || loadingAnclas,
  };
}
