import { useState } from 'react';
import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { esTipoPorUnidad, ETIQUETA_TIPO, calcularPnL, type ActivoAgrupado } from '../../lib/finance/patrimonio';
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
}

export function ActivoCard({ activo, onEditarLote, onVender }: ActivoCardProps) {
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

      <div className="flex items-center justify-between mt-2 gap-2">
        {variasCompras ? (
          <p className="text-xs text-[var(--color-accent)]">
            {expandido ? '▾' : '▸'} {activo.lotes.length} compras
          </p>
        ) : (
          <span />
        )}
        {esTipoPorUnidad(activo.tipo) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVender(activo);
            }}
            className="text-xs font-semibold text-[var(--color-accent)] shrink-0"
          >
            Vender
          </button>
        )}
      </div>

      {variasCompras && expandido && (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
          {/* Mas reciente primero: activo.lotes esta ordenado ascendente (necesario para saber
              cual es "la primera compra", ver construirActivo en lib/finance/patrimonio.ts) —
              se invierte solo para mostrar, sin tocar ese orden real. */}
          {[...activo.lotes].reverse().map((lote) => {
            const pnlLote = calcularPnL(lote);
            return (
              <div
                key={lote.id}
                className="flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditarLote(lote);
                }}
              >
                <span className="text-[var(--color-text-muted)] flex items-center gap-1 min-w-0">
                  {lote.error_precio && (
                    <span
                      title={`No se ha podido actualizar el precio: ${lote.error_precio}`}
                      className="text-[var(--color-loss)] shrink-0"
                    >
                      ⚠
                    </span>
                  )}
                  <span className="truncate">{textoLote(lote)}</span>
                </span>
                <span className={`font-mono font-semibold shrink-0 ${claseColorPorSigno(pnlLote.eur)}`}>
                  {pnlLote.eur > 0 ? '+' : ''}
                  {formatearImporte(pnlLote.eur)} €{pnlLote.pct !== null ? ` (${pnlLote.pct > 0 ? '+' : ''}${formatearImporte(pnlLote.pct, 1)}%)` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
