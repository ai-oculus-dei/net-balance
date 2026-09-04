import { useCallback, useEffect, useState } from 'react';
import {
  actualizarPosicionPatrimonio,
  archivarPosicionPatrimonio,
  crearPosicionPatrimonio,
  fetchPosicionesPatrimonio,
  type NuevaPosicionPatrimonio,
} from '../lib/supabase/queries/patrimonio';
import { registrarVentaPatrimonio } from '../lib/supabase/queries/ventas';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';
import { calcularVentaFIFO } from '../lib/finance/ventas';
import type { ActivoAgrupado } from '../lib/finance/patrimonio';
import { emitPatrimonioChanged, onPatrimonioChanged } from '../lib/events/patrimonioBus';

export function usePosicionesPatrimonio() {
  const [posiciones, setPosiciones] = useState<PosicionPatrimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPosicionesPatrimonio()
      .then(setPosiciones)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Se refresca tambien cuando otra pantalla (p.ej. el alta rapida global de AppShell, o el
  // snapshot diario al arrancar la app) cambia posiciones.
  useEffect(() => onPatrimonioChanged(recargar), [recargar]);

  async function crear(posicion: NuevaPosicionPatrimonio) {
    await crearPosicionPatrimonio(posicion);
    await recargar();
    emitPatrimonioChanged();
  }

  async function actualizar(id: string, cambios: Partial<PosicionPatrimonio>) {
    await actualizarPosicionPatrimonio(id, cambios);
    await recargar();
    emitPatrimonioChanged();
  }

  async function archivar(id: string) {
    await archivarPosicionPatrimonio(id);
    await recargar();
    emitPatrimonioChanged();
  }

  // Vende (total o parcialmente) un activo agrupado: reparte la cantidad entre sus lotes por
  // FIFO (los mas antiguos primero, ver calcularVentaFIFO) y, si se indica, abona el importe
  // recibido en una cuenta existente — todo en una unica transaccion (registrar_venta_patrimonio).
  async function vender(activo: ActivoAgrupado, cantidadAVender: number, precioVentaUnitario: number, cuentaDestinoId: string | null) {
    const resultado = calcularVentaFIFO(activo.lotes, cantidadAVender, precioVentaUnitario);
    await registrarVentaPatrimonio({
      lotesActualizar: resultado.actualizaciones,
      tipo: activo.tipo,
      nombre: activo.nombre,
      ticker: activo.ticker,
      mercado: activo.mercado,
      cantidadVendida: cantidadAVender,
      precioVentaUnitario,
      importeRecibido: resultado.importeRecibido,
      costeBaseTotal: resultado.costeBaseTotal,
      gananciaRealizada: resultado.gananciaRealizada,
      cuentaDestinoId,
    });
    await recargar();
    emitPatrimonioChanged();
  }

  return { posiciones, loading, error, crear, actualizar, archivar, vender, recargar };
}
