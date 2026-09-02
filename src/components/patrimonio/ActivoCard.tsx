import { useState } from 'react';
import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { ETIQUETA_TIPO, calcularPnL, etiquetaFechaCompra, precioActualTotal, type ActivoAgrupado } from '../../lib/finance/patrimonio';
import { formatearCantidad, formatearImporte } from '../../lib/finance/formato';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface ActivoCardProps {
  activo: ActivoAgrupado;
  onEditarLote: (lote: PosicionPatrimonio) => void;
}

export function ActivoCard({ activo, onEditarLote }: ActivoCardProps) {
  const [expandido, setExpandido] = useState(false);
  const variasCompras = activo.lotes.length > 1;
  const loteConError = activo.lotes.find((l) => l.error_precio);

  function handleClick() {
    if (variasCompras) setExpandido((v) => !v);
    else onEditarLote(activo.lotes[0]);
  }

  const precioActualUnitario = activo.cantidadTotal > 0 ? activo.valorActualTotal / activo.cantidadTotal : 0;

  return (
    <Card className="cursor-pointer hover:opacity-90 min-w-0" onClick={handleClick}>
      {/* Fila 1: Ticker (o Nombre si no tiene) + aviso de error ... Tipo */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1 min-w-0">
          <span className={`truncate min-w-0 flex-1 ${activo.ticker ? 'text-[var(--color-text-muted)]' : ''}`}>
            {activo.ticker ? `[${activo.ticker}]` : activo.nombre}
          </span>
          {loteConError && (
            <span
              title={`No se ha podido actualizar el precio: ${loteConError.error_precio}`}
              className="text-[var(--color-loss)] shrink-0"
            >
              ⚠
            </span>
          )}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">{ETIQUETA_TIPO[activo.tipo]}</span>
      </div>

      {/* Fila 2: Nombre (solo si la fila 1 ya se uso para el Ticker) */}
      {activo.ticker && <p className="text-sm font-medium mb-1 truncate">{activo.nombre}</p>}

      {/* Fila 3: cantidad x precio medio ... valor actual total (solo con ticker: sin ticker no
          hay "unidades" que valgan la pena desglosar, se va directa a la fila 4) */}
      {activo.ticker && (
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatearCantidad(activo.cantidadTotal)} x {formatearImporte(activo.precioCompraMedio)} €/ea
          </span>
          <span className="font-mono text-sm font-semibold">{formatearImporte(activo.valorActualTotal)} €</span>
        </div>
      )}

      {/* Fila 4: con ticker, precio actual por unidad (el total ya salio en la fila 3); sin
          ticker, el valor actual total (no hay fila 3 que lo muestre) ... P&L */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">
          {activo.ticker ? `${formatearImporte(precioActualUnitario)} €/ea` : `${formatearImporte(activo.valorActualTotal)} €`}
        </span>
        <span className={`font-mono text-xs font-semibold ${claseColorPorSigno(activo.pnl.eur)}`}>
          {activo.pnl.eur > 0 ? '+' : ''}
          {formatearImporte(activo.pnl.eur)} €{activo.pnl.pct !== null ? ` (${activo.pnl.pct > 0 ? '+' : ''}${formatearImporte(activo.pnl.pct, 1)}%)` : ''}
        </span>
      </div>

      {variasCompras && (
        <p className="text-xs text-[var(--color-accent)] mt-2">
          {expandido ? '▾' : '▸'} {activo.lotes.length} compras
        </p>
      )}

      {variasCompras && expandido && (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
          {activo.lotes.map((lote) => {
            const pnlLote = calcularPnL(lote);
            const valorLote = precioActualTotal(lote);
            return (
              <div
                key={lote.id}
                className="flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditarLote(lote);
                }}
              >
                <span className="text-[var(--color-text-muted)] flex items-center gap-1">
                  {lote.error_precio && (
                    <span title={`No se ha podido actualizar el precio: ${lote.error_precio}`} className="text-[var(--color-loss)]">
                      ⚠
                    </span>
                  )}
                  {etiquetaFechaCompra(lote.fecha_compra)} · {formatearCantidad(lote.cantidad)} uds
                </span>
                <span className={`font-mono font-semibold ${claseColorPorSigno(pnlLote.eur)}`}>
                  {formatearImporte(valorLote)} €{pnlLote.pct !== null ? ` (${pnlLote.pct > 0 ? '+' : ''}${formatearImporte(pnlLote.pct, 1)}%)` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
