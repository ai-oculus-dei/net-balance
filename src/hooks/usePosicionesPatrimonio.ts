import { useCallback, useEffect, useState } from 'react';
import {
  actualizarPosicionPatrimonio,
  ajustarCuentaPatrimonio,
  archivarPosicionPatrimonio,
  crearPosicionPatrimonio,
  fetchPosicionesPatrimonio,
  type NuevaPosicionPatrimonio,
} from '../lib/supabase/queries/patrimonio';
import { registrarVentaPatrimonio } from '../lib/supabase/queries/ventas';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';
import { ajustarCuenta as calcularAjusteCuenta, calcularVentaFIFO } from '../lib/finance/ventas';
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
  // FIFO (los mas antiguos primero, ver calcularVentaFIFO) y, si se indica, hace crecer una
  // cuenta existente con el importe recibido (ver ajustarCuenta — nunca crea una posicion nueva)
  // — todo en una unica transaccion (registrar_venta_patrimonio).
  async function vender(activo: ActivoAgrupado, cantidadAVender: number, precioVentaUnitario: number, cuentaDestinoId: string | null) {
    const resultado = calcularVentaFIFO(activo.lotes, cantidadAVender, precioVentaUnitario);
    let destino: { precio_compra_unitario: number; precio_actual_unitario: number } | null = null;
    if (cuentaDestinoId) {
      const loteDestino = posiciones.find((p) => p.id === cuentaDestinoId);
      if (!loteDestino) throw new Error('Cuenta destino no encontrada.');
      destino = calcularAjusteCuenta(loteDestino, resultado.importeRecibido);
    }
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
      destinoPrecioCompraUnitario: destino?.precio_compra_unitario ?? null,
      destinoPrecioActualUnitario: destino?.precio_actual_unitario ?? null,
    });
    await recargar();
    emitPatrimonioChanged();
  }

  // Hace crecer (delta > 0) o reduce (delta < 0) una cuenta "de saldo" ya existente, en vez de
  // crear una posicion nueva agrupada visualmente con ella — ver ajustarCuenta en
  // lib/finance/ventas.ts. `fecha` es el dia del cambio (no necesariamente hoy), y tambien la
  // fecha del punto que se corrige en patrimonio_historico.
  async function ajustarCuenta(posicionId: string, delta: number, fecha: string) {
    const lote = posiciones.find((p) => p.id === posicionId);
    if (!lote) throw new Error('Posición no encontrada.');
    const resultado = calcularAjusteCuenta(lote, delta, new Date(`${fecha}T00:00:00`));
    await ajustarCuentaPatrimonio(posicionId, resultado, fecha);
    await recargar();
    emitPatrimonioChanged();
  }

  return { posiciones, loading, error, crear, actualizar, archivar, vender, ajustarCuenta, recargar };
}
