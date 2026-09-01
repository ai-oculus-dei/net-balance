import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { ETIQUETA_TIPO, calcularPnL, precioActualTotal } from '../../lib/finance/patrimonio';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PosicionCardProps {
  posicion: PosicionPatrimonio;
  onClick: () => void;
}

export function PosicionCard({ posicion, onClick }: PosicionCardProps) {
  const valorActual = precioActualTotal(posicion);
  const pnl = calcularPnL(posicion);

  return (
    <Card className="cursor-pointer hover:opacity-90" onClick={onClick}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <h3 className="font-semibold text-sm truncate">{posicion.nombre}</h3>
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">{ETIQUETA_TIPO[posicion.tipo]}</span>
      </div>

      {posicion.ticker && (
        <p className="text-xs text-[var(--color-text-muted)] mb-1 truncate">
          {posicion.ticker}
          {posicion.mercado ? ` · ${posicion.mercado}` : ''}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{valorActual.toFixed(2)} €</span>
        <span className={`font-mono text-xs font-semibold ${claseColorPorSigno(pnl.eur)}`}>
          {pnl.eur > 0 ? '+' : ''}
          {pnl.eur.toFixed(2)} €{pnl.pct !== null ? ` (${pnl.pct > 0 ? '+' : ''}${pnl.pct.toFixed(1)}%)` : ''}
        </span>
      </div>
    </Card>
  );
}
