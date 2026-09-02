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

  function handleClick() {
    if (variasCompras) setExpandido((v) => !v);
    else onEditarLote(activo.lotes[0]);
  }

  return (
    <Card className="cursor-pointer hover:opacity-90" onClick={handleClick}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <h3 className="font-semibold text-sm truncate">{activo.nombre}</h3>
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">{ETIQUETA_TIPO[activo.tipo]}</span>
      </div>

      {activo.ticker && (
        <p className="text-xs text-[var(--color-text-muted)] mb-1 truncate">
          {activo.ticker}
          {activo.mercado ? ` · ${activo.mercado}` : ''}
        </p>
      )}

      {activo.ticker && (
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {formatearCantidad(activo.cantidadTotal)} uds · Precio medio {formatearImporte(activo.precioCompraMedio)} €
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{formatearImporte(activo.valorActualTotal)} €</span>
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
                <span className="text-[var(--color-text-muted)]">
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
