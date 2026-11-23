import { Card, CardTitle } from '../ui/Card';
import { Cargando } from '../ui/Spinner';
import { IconActividad } from '../icons/UiIcons';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { patrimonioPnLTotal } from '../../lib/finance/patrimonio';
import { IMPORTE_OCULTO } from '../../lib/preferencias/preferencias';
import { usePreferencias } from '../../lib/preferencias/usePreferencias';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioPnLCardProps {
  posiciones: PosicionPatrimonio[];
  loading: boolean;
}

export function PatrimonioPnLCard({ posiciones, loading }: PatrimonioPnLCardProps) {
  const pnl = patrimonioPnLTotal(posiciones);
  const { ocultarTotales } = usePreferencias().preferencias;

  return (
    <Card>
      <CardTitle icon={<IconActividad />} className="mb-3">
        P&amp;L total
      </CardTitle>
      {loading ? (
        <Cargando />
      ) : (
        <div className={`flex items-baseline justify-between gap-3 ${claseColorPorSigno(pnl.eur)}`}>
          <span className="kpi-value">
            {ocultarTotales ? IMPORTE_OCULTO : `${pnl.eur > 0 ? '+' : ''}${formatearImporte(pnl.eur)}`} €
          </span>
          {pnl.pct !== null && (
            <span className="font-mono text-sm font-semibold">
              {pnl.pct > 0 ? '+' : ''}
              {formatearImporte(pnl.pct, 1)}%
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
