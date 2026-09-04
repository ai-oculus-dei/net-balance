import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { patrimonioPnLTotal } from '../../lib/finance/patrimonio';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioPnLCardProps {
  posiciones: PosicionPatrimonio[];
  loading: boolean;
}

export function PatrimonioPnLCard({ posiciones, loading }: PatrimonioPnLCardProps) {
  const pnl = patrimonioPnLTotal(posiciones);

  return (
    <Card>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center">Cargando...</p>
      ) : (
        <div className={`flex items-center justify-between font-mono text-lg font-bold ${claseColorPorSigno(pnl.eur)}`}>
          <span>
            {pnl.eur > 0 ? '+' : ''}
            {formatearImporte(pnl.eur)} €
          </span>
          {pnl.pct !== null && (
            <span>
              {pnl.pct > 0 ? '+' : ''}
              {formatearImporte(pnl.pct, 1)}%
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
