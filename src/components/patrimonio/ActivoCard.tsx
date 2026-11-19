import { useState } from 'react';
import { Card } from '../ui/Card';
import { IconVisualizaciones } from '../layout/NavIcons';
import { IconAlerta, IconChevronDown } from '../icons/UiIcons';
import { claseColorPorSigno } from '../charts/colors';
import { esCuentaGastos, esTipoPorUnidad, ETIQUETA_TIPO, calcularPnL, type ActivoAgrupado } from '../../lib/finance/patrimonio';
import {
  formatearCantidad,
  formatearCantidadTruncada,
  formatearImporte,
  formatearImporteCorto,
} from '../../lib/finance/formato';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

// Por encima de este numero de caracteres, "cantidad x precio €/ea" ya no suele caber en el
// ancho de una tarjeta en movil (aproximado por longitud de texto: no hay forma de medir el
// ancho real en pixeles sin montar el DOM) — en ese caso se abrevia el precio en miles.
const UMBRAL_CARACTERES_LOTE = 20;

function textoLote(lote: Pick<PosicionPatrimonio, 'cantidad' | 'precio_compra_unitario'>): string {
  const cantidad = formatearCantidadTruncada(lote.cantidad, 4);
  const completo = `${cantidad} x ${formatearImporte(lote.precio_compra_unitario)} €/ea`;
  if (completo.length <= UMBRAL_CARACTERES_LOTE) return completo;
  return `${cantidad} x ${formatearImporteCorto(lote.precio_compra_unitario)} €/ea`;
}

interface ActivoCardProps {
  activo: ActivoAgrupado;
  onEditarLote: (lote: PosicionPatrimonio) => void;
  onVender: (activo: ActivoAgrupado) => void;
  onReducir: (activo: ActivoAgrupado) => void;
  onVerGrafico: (activo: ActivoAgrupado) => void;
}

export function ActivoCard({ activo, onEditarLote, onVender, onReducir, onVerGrafico }: ActivoCardProps) {
  const [expandido, setExpandido] = useState(false);
  // Cuentas Corriente/Remunerada/Ahorro/Fondo Monetario ya no se tratan como una inversion con
  // coste de compra propio (ver ajustarCuenta en lib/finance/ventas.ts): no tiene sentido
  // mostrarles P&L, ni la idea de "varias compras" — son siempre UNA cuenta que crece/decrece
  // (aunque quedara mas de un lote de antes de este cambio, no se muestra como tal).
  const mostrarPnL = esTipoPorUnidad(activo.tipo);
  const variasCompras = mostrarPnL && activo.lotes.length > 1;
  const loteConError = activo.lotes.find((l) => l.error_precio);

  function handleClick() {
    if (variasCompras) setExpandido((v) => !v);
    else onEditarLote(activo.lotes[0]);
  }

  const precioActualUnitario = activo.cantidadTotal > 0 ? activo.valorActualTotal / activo.cantidadTotal : 0;

  return (
    <Card className="min-w-0" onClick={handleClick}>
      {/* Fila 1: Ticker (o Nombre si no tiene) + aviso de error ... Tipo */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <h3 className="font-semibold text-[14.5px] flex items-center gap-1.5 min-w-0">
          {activo.ticker ? (
            <span className="tag !text-cyan !border-[color-mix(in_srgb,var(--cyan)_35%,transparent)] truncate min-w-0">
              {activo.ticker}
            </span>
          ) : (
            <span className="truncate min-w-0 flex-1">{activo.nombre}</span>
          )}
          {loteConError && (
            <span title={`No se ha podido actualizar el precio: ${loteConError.error_precio}`} className="text-warn shrink-0 flex">
              <IconAlerta className="w-4 h-4" aria-label="Error al actualizar el precio" />
            </span>
          )}
        </h3>
        <span className="kpi-label !text-[10px] shrink-0">{ETIQUETA_TIPO[activo.tipo]}</span>
      </div>

      {/* Fila 2: Nombre (solo si la fila 1 ya se uso para el Ticker) */}
      {activo.ticker && <p className="text-[14.5px] font-medium mb-1.5 truncate">{activo.nombre}</p>}

      {/* Fila 3: cantidad x precio medio ... valor actual total (solo con ticker: sin ticker no
          hay "unidades" que valgan la pena desglosar, se va directa a la fila 4) */}
      {activo.ticker && (
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-[11.5px] text-muted truncate min-w-0">
            {formatearCantidad(activo.cantidadTotal)} x {formatearImporte(activo.precioCompraMedio)} €/ea
          </span>
          <span className="font-mono text-[15px] font-semibold shrink-0">{formatearImporte(activo.valorActualTotal)} €</span>
        </div>
      )}

      {/* Fila 4: con ticker, precio actual por unidad (el total ya salio en la fila 3); sin
          ticker, el valor actual total (no hay fila 3 que lo muestre) ... P&L */}
      <div className="flex items-center justify-between gap-2">
        <span className={`font-mono font-semibold ${activo.ticker ? 'text-[12.5px] text-muted' : 'text-[17px]'}`}>
          {activo.ticker ? `${formatearImporte(precioActualUnitario)} €/ea` : `${formatearImporte(activo.valorActualTotal)} €`}
        </span>
        {mostrarPnL && (
          <span className={`font-mono text-xs font-semibold text-right ${claseColorPorSigno(activo.pnl.eur)}`}>
            {activo.pnl.eur > 0 ? '+' : ''}
            {formatearImporte(activo.pnl.eur)} €{activo.pnl.pct !== null ? ` (${activo.pnl.pct > 0 ? '+' : ''}${formatearImporte(activo.pnl.pct, 1)}%)` : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 gap-2 border-t border-dashed border-line">
        {variasCompras ? (
          <p className="flex items-center gap-1 font-mono text-xs text-cyan">
            <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? '' : '-rotate-90'}`} />
            {activo.lotes.length} compras
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {activo.ticker && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onVerGrafico(activo);
              }}
              aria-label="Ver histórico"
              title="Ver histórico"
              className="icon-btn"
            >
              <IconVisualizaciones />
            </button>
          )}
          {esTipoPorUnidad(activo.tipo) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onVender(activo);
              }}
              className="btn btn-ghost btn-sm !text-cyan"
            >
              Vender
            </button>
          )}
          {!esTipoPorUnidad(activo.tipo) && !esCuentaGastos(activo) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReducir(activo);
              }}
              className="btn btn-ghost btn-sm !text-cyan"
            >
              Reducir
            </button>
          )}
        </div>
      </div>

      {variasCompras && expandido && (
        <div className="mt-2 flex flex-col">
          {/* Mas reciente primero: activo.lotes esta ordenado ascendente (necesario para saber
              cual es "la primera compra", ver construirActivo en lib/finance/patrimonio.ts) —
              se invierte solo para mostrar, sin tocar ese orden real. */}
          {[...activo.lotes].reverse().map((lote) => {
            const pnlLote = calcularPnL(lote);
            return (
              <div
                key={lote.id}
                className="flex items-center justify-between gap-2 text-xs rounded-[8px] px-2 py-2 hover-tint border-b border-dashed border-line last:border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditarLote(lote);
                }}
              >
                <span className="text-muted flex items-center gap-1 min-w-0 font-mono">
                  {lote.error_precio && (
                    <span title={`No se ha podido actualizar el precio: ${lote.error_precio}`} className="text-warn shrink-0 flex">
                      <IconAlerta className="w-3.5 h-3.5" aria-label="Error al actualizar el precio" />
                    </span>
                  )}
                  <span className="truncate">{textoLote(lote)}</span>
                </span>
                {mostrarPnL && (
                  <span className={`font-mono font-semibold shrink-0 ${claseColorPorSigno(pnlLote.eur)}`}>
                    {pnlLote.eur > 0 ? '+' : ''}
                    {formatearImporte(pnlLote.eur)} €{pnlLote.pct !== null ? ` (${pnlLote.pct > 0 ? '+' : ''}${formatearImporte(pnlLote.pct, 1)}%)` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
