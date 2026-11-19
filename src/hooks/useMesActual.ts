import { useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useAnclasPeriodo } from './useAnclasPeriodo';
import { resolverPeriodoActual } from '../lib/finance/periodos';

// Movimientos del periodo (mes personal) en curso, para Inicio.
export function useMesActual(fecha: Date = new Date()) {
  // Clave estable (año-mes-dia) en vez de la referencia de `fecha`: si quien llama pasa un
  // `new Date()` fresco en cada render (o usa el valor por defecto), esto evita que
  // useMemo/useEffect de abajo detecten un "cambio" en cada render y entren en bucle de
  // recarga infinita. Se incluye el dia (no solo año-mes) porque el rango depende de las
  // anclas de periodo, y cual es "hoy" dentro del mes puede cambiar el periodo resuelto (ver
  // resolverPeriodoActual).
  const claveDia = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
  const { anclas, loading: loadingAnclas } = useAnclasPeriodo();
  const { rango, mesEtiqueta } = useMemo(() => {
    const { rango, etiqueta } = resolverPeriodoActual(anclas, fecha);
    return { rango, mesEtiqueta: new Date(etiqueta.year, etiqueta.month, 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anclas, claveDia]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);

  return {
    movimientos,
    mesEtiqueta,
    loading: loadingMovimientos || loadingAnclas,
  };
}
