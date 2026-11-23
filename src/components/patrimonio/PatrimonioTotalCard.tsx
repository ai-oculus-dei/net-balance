import { Card, CardTitle } from '../ui/Card';
import { Cargando } from '../ui/Spinner';
import { IconCartera, IconOjo, IconOjoTachado } from '../icons/UiIcons';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { crecimientoDesdeInicioAnio, patrimonioTotalActual } from '../../lib/finance/patrimonio';
import { IMPORTE_OCULTO } from '../../lib/preferencias/preferencias';
import { usePreferencias } from '../../lib/preferencias/usePreferencias';
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
  const { preferencias, cambiar } = usePreferencias();
  const oculto = preferencias.ocultarTotales;
  const total = patrimonioTotalActual(posiciones);
  const crecimiento = crecimientoDesdeInicioAnio(historico, total, todasLasPosiciones, preciosHistoricos, ventasLotes);

  return (
    <Card glow>
      <div className="flex items-center justify-between gap-3 mb-3">
        <CardTitle icon={<IconCartera />}>Patrimonio total</CardTitle>
        <button
          type="button"
          onClick={() => cambiar({ ocultarTotales: !oculto })}
          aria-label={oculto ? 'Mostrar importes' : 'Ocultar importes'}
          aria-pressed={oculto}
          title={oculto ? 'Mostrar importes' : 'Ocultar importes'}
          className="icon-btn shrink-0 !w-8 !h-8"
        >
          {oculto ? <IconOjoTachado /> : <IconOjo />}
        </button>
      </div>
      {loading ? (
        <Cargando />
      ) : (
        <>
          <p
            className="font-mono text-[34px] leading-tight font-semibold tracking-[-0.02em] text-cyan break-all"
            style={{ textShadow: '0 0 18px color-mix(in srgb, var(--cyan) 35%, transparent)' }}
          >
            {oculto ? IMPORTE_OCULTO : formatearImporte(total)} €
          </p>
          {crecimiento.pct !== null && (
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-line">
              <span className="kpi-label">Desde el 1 de enero</span>
              <span className={`font-mono text-sm font-semibold ${claseColorPorSigno(crecimiento.eur)}`}>
                {oculto ? IMPORTE_OCULTO : `${crecimiento.eur > 0 ? '+' : ''}${formatearImporte(crecimiento.eur)}`} € (
                {crecimiento.pct > 0 ? '+' : ''}
                {formatearImporte(crecimiento.pct, 1)}%)
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
