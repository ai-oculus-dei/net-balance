import type { PosicionPatrimonio } from '../supabase/database.types';
import { toIsoDate } from './fechas';
import { precioActualUnitarioEfectivo, round2 } from './patrimonio';

const EPSILON_CANTIDAD = 1e-6;
const EPSILON_EUR = 0.005;

function round(v: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(v * factor) / factor;
}

export interface ActualizacionLote {
  id: string;
  archivar: boolean;
  cantidad?: number; // solo presente cuando archivar es false
}

export interface ResultadoVentaFIFO {
  actualizaciones: ActualizacionLote[];
  costeBaseTotal: number;
  importeRecibido: number;
  gananciaRealizada: number;
  gananciaRealizadaPct: number | null; // null si el coste base es 0
}

// Reparte `cantidadAVender` entre `lotes` consumiendo primero los mas antiguos (FIFO) — `lotes`
// debe venir ya ordenado por fecha_compra ascendente, tal cual lo da `ActivoAgrupado.lotes`
// (ver construirActivo en patrimonio.ts). Lanza si la cantidad pedida supera lo disponible: se
// valida en el formulario antes de llamar, esto es la ultima defensa antes de escribir en la BD.
export function calcularVentaFIFO(
  lotes: PosicionPatrimonio[],
  cantidadAVender: number,
  precioVentaUnitario: number
): ResultadoVentaFIFO {
  let restante = cantidadAVender;
  let costeBaseTotal = 0;
  const actualizaciones: ActualizacionLote[] = [];

  for (const lote of lotes) {
    if (restante <= EPSILON_CANTIDAD) break;
    const tomado = Math.min(lote.cantidad, restante);
    costeBaseTotal += tomado * lote.precio_compra_unitario;
    restante -= tomado;
    if (lote.cantidad - tomado <= EPSILON_CANTIDAD) {
      actualizaciones.push({ id: lote.id, archivar: true });
    } else {
      actualizaciones.push({ id: lote.id, archivar: false, cantidad: round(lote.cantidad - tomado, 8) });
    }
  }

  if (restante > EPSILON_CANTIDAD) {
    throw new Error('La cantidad a vender supera lo disponible en este activo.');
  }

  const costeBase = round2(costeBaseTotal);
  const importeRecibido = round2(cantidadAVender * precioVentaUnitario);
  const gananciaRealizada = round2(importeRecibido - costeBase);
  const gananciaRealizadaPct = costeBase > 0 ? round2((gananciaRealizada / costeBase) * 100) : null;

  return {
    actualizaciones,
    costeBaseTotal: costeBase,
    importeRecibido,
    gananciaRealizada,
    gananciaRealizadaPct,
  };
}

export type ResultadoRetirada =
  | { archivar: true }
  | {
      archivar: false;
      cambios: Partial<Pick<PosicionPatrimonio, 'precio_compra_unitario' | 'fecha_compra' | 'precio_actual_unitario' | 'tae'>>;
    };

// Efecto de retirar `importe` de una cuenta de un unico lote. Sin TAE, solo baja el saldo actual.
// Con TAE, cristaliza: el valor actual efectivo (principal + interes acumulado a hoy) menos el
// importe pasa a ser el nuevo principal con fecha de hoy, y la TAE se mantiene igual. Si el
// importe agota el saldo disponible, señala archivar en vez de dejar un resto ~0. Lanza si el
// importe supera el saldo disponible.
export function retirarDeCuenta(lote: PosicionPatrimonio, importe: number, hoy: Date = new Date()): ResultadoRetirada {
  const saldoActual = precioActualUnitarioEfectivo(lote, hoy);
  if (importe > saldoActual + EPSILON_EUR) {
    throw new Error('El importe supera el saldo disponible en la cuenta.');
  }

  const restante = round2(saldoActual - importe);
  if (restante <= 0) {
    return { archivar: true };
  }

  if (lote.tae !== null) {
    return {
      archivar: false,
      cambios: {
        precio_compra_unitario: restante,
        fecha_compra: toIsoDate(hoy),
        precio_actual_unitario: null,
        tae: lote.tae,
      },
    };
  }

  return { archivar: false, cambios: { precio_actual_unitario: restante } };
}
