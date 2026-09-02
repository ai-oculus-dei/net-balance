import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { crecimientoDesdeInicioAnio, patrimonioTotalActual } from '../../lib/finance/patrimonio';
import type { PatrimonioHistorico, PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioTotalCardProps {
  posiciones: PosicionPatrimonio[];
  historico: PatrimonioHistorico[];
  loading: boolean;
}

export function PatrimonioTotalCard({ posiciones, historico, loading }: PatrimonioTotalCardProps) {
  const total = patrimonioTotalActual(posiciones);
  const crecimiento = crecimientoDesdeInicioAnio(historico, total);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide text-center">
        Patrimonio total
      </h2>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center">Cargando...</p>
      ) : (
        <>
          <p className="font-mono text-4xl font-bold text-[var(--color-accent)] text-center">
            {formatearImporte(total)} €
          </p>
          <div className="flex justify-end items-baseline gap-1.5 mt-3">
            <span className="text-xs text-[var(--color-text-muted)]">desde 1 ene</span>
            <span className={`font-mono text-sm font-semibold ${claseColorPorSigno(crecimiento.eur)}`}>
              {crecimiento.eur > 0 ? '+' : ''}
              {formatearImporte(crecimiento.eur)} €
              {crecimiento.pct !== null
                ? ` (${crecimiento.pct > 0 ? '+' : ''}${formatearImporte(crecimiento.pct, 1)}%)`
                : ''}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
