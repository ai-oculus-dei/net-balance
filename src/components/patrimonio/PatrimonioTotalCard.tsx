import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { crecimientoDesdeInicioAnio, patrimonioTotalActual } from '../../lib/finance/patrimonio';
import type { PrecioDiarioActivo, VentaLote } from '../../lib/finance/historicoPrecioActivo';
import type { PatrimonioHistorico, PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioTotalCardProps {
  posiciones: PosicionPatrimonio[];
  historico: PatrimonioHistorico[];
  loading: boolean;
  // Para que el "crecimiento desde 1 de enero" tambien use el precio real de las posiciones con
  // ticker en esa fecha, en vez del backfill plano ya retirado (ver crecimientoDesdeInicioAnio).
  todasLasPosiciones?: PosicionPatrimonio[];
  preciosHistoricos?: PrecioDiarioActivo[];
  ventasLotes?: VentaLote[];
}

export function PatrimonioTotalCard({
  posiciones,
  historico,
  loading,
  todasLasPosiciones = posiciones,
  preciosHistoricos = [],
  ventasLotes = [],
}: PatrimonioTotalCardProps) {
  const total = patrimonioTotalActual(posiciones);
  const crecimiento = crecimientoDesdeInicioAnio(historico, total, todasLasPosiciones, preciosHistoricos, ventasLotes);

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
          {crecimiento.pct !== null && (
            <div className="flex justify-end mt-3">
              <span className={`font-mono text-sm font-semibold ${claseColorPorSigno(crecimiento.eur)}`}>
                {crecimiento.eur > 0 ? '+' : ''}
                {formatearImporte(crecimiento.eur)} € ({crecimiento.pct > 0 ? '+' : ''}
                {formatearImporte(crecimiento.pct, 1)}%)
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
