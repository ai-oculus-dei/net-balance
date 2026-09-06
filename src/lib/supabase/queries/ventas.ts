import { supabase } from '../client';
import { fetchTodasLasFilas } from '../paginacion';
import type { ActualizacionLote, ResultadoRetirada } from '../../finance/ventas';
import type { NuevaPosicionPatrimonio } from './patrimonio';
import type { VentaPatrimonioLote } from '../database.types';

// El ledger completo (todas las posiciones del usuario, RLS lo filtra) — se usa para reconstruir
// cuantas unidades de cada lote seguian en cartera en una fecha pasada, ver
// src/lib/finance/historicoPrecioActivo.ts. Paginado (ver fetchTodasLasFilas) por si supera el
// limite de filas por consulta de Supabase.
export async function fetchVentasPatrimonioLotes(): Promise<VentaPatrimonioLote[]> {
  return fetchTodasLasFilas(async (desde, hasta) =>
    supabase.from('ventas_patrimonio_lotes').select('*').order('fecha', { ascending: true }).range(desde, hasta)
  );
}

export interface DatosVentaPatrimonio {
  lotesActualizar: ActualizacionLote[];
  tipo: string;
  nombre: string;
  ticker: string | null;
  mercado: string | null;
  cantidadVendida: number;
  precioVentaUnitario: number;
  importeRecibido: number;
  costeBaseTotal: number;
  gananciaRealizada: number;
  cuentaDestinoId: string | null;
}

// Aplica una venta (ya calculada con calcularVentaFIFO) en una unica transaccion: reduce/archiva
// los lotes indicados, registra la venta, y si hay cuenta destino le abona el importe recibido.
export async function registrarVentaPatrimonio(datos: DatosVentaPatrimonio): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_venta_patrimonio', {
    // El RPC lee snake_case (jsonb_to_recordset) — se traduce aqui desde el objeto en camelCase.
    p_lotes_actualizar: datos.lotesActualizar.map((l) => ({
      id: l.id,
      archivar: l.archivar,
      cantidad: l.cantidad ?? null,
      cantidad_consumida: l.cantidadConsumida,
    })),
    p_tipo: datos.tipo,
    p_nombre: datos.nombre,
    p_ticker: datos.ticker,
    p_mercado: datos.mercado,
    p_cantidad_vendida: datos.cantidadVendida,
    p_precio_venta_unitario: datos.precioVentaUnitario,
    p_importe_recibido: datos.importeRecibido,
    p_coste_base_total: datos.costeBaseTotal,
    p_ganancia_realizada: datos.gananciaRealizada,
    p_cuenta_destino_id: datos.cuentaDestinoId,
  });
  if (error) throw error;
  return data as string;
}

// Crea una posicion nueva y, si se elige una cuenta origen, descuenta en la misma transaccion el
// resultado ya calculado con retirarDeCuenta (archivar la cuenta, o los campos a cambiar).
export async function crearPosicionFinanciada(
  posicion: NuevaPosicionPatrimonio,
  cuentaOrigenId: string,
  resultadoOrigen: ResultadoRetirada
): Promise<string> {
  const { data, error } = await supabase.rpc('crear_posicion_financiada_patrimonio', {
    p_tipo: posicion.tipo,
    p_nombre: posicion.nombre,
    p_ticker: posicion.ticker,
    p_mercado: posicion.mercado,
    p_moneda: posicion.moneda,
    p_cantidad: posicion.cantidad,
    p_precio_compra_unitario: posicion.precio_compra_unitario,
    p_precio_actual_unitario: posicion.precio_actual_unitario,
    p_tae: posicion.tae,
    p_fecha_compra: posicion.fecha_compra,
    p_cuenta_origen_id: cuentaOrigenId,
    p_origen_archivar: resultadoOrigen.archivar,
    p_origen_precio_compra_unitario: resultadoOrigen.archivar ? null : (resultadoOrigen.cambios.precio_compra_unitario ?? null),
    p_origen_fecha_compra: resultadoOrigen.archivar ? null : (resultadoOrigen.cambios.fecha_compra ?? null),
    p_origen_precio_actual_unitario: resultadoOrigen.archivar ? null : (resultadoOrigen.cambios.precio_actual_unitario ?? null),
    p_origen_tae: resultadoOrigen.archivar ? null : (resultadoOrigen.cambios.tae ?? null),
  });
  if (error) throw error;
  return data as string;
}
