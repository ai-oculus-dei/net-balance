import { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { BalancePorCategoriaChart } from '../components/charts/BalancePorCategoriaChart';
import { SerieTemporalChart } from '../components/charts/SerieTemporalChart';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { agruparPorMes, rangoUltimosMeses } from '../lib/finance/fechas';
import { balancePorCategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import { claseColorPorSigno } from '../components/charts/colors';

const MESES_SERIE = 6;

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const { ingresoReal, gastosFijos, disponible, movimientos, loading: loadingDisponible } = useDisponibleMes(hoy);
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const rangoSerie = useMemo(() => rangoUltimosMeses(MESES_SERIE, hoy), [hoy]);
  const { movimientos: movimientosSerie, loading: loadingSerie } = useMovimientos(rangoSerie);

  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);
  const balanceCategorias = useMemo(
    () => balancePorCategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );
  const serieTemporal = useMemo(
    () => agruparPorMes(movimientosSerie, MESES_SERIE, hoy),
    [movimientosSerie, hoy]
  );

  const loading = loadingDisponible || loadingTaxonomia;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
          Este mes
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Ingreso real</p>
            <p className="font-mono font-semibold text-[var(--color-gain)]">{ingresoReal.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Gastos fijos</p>
            <p className="font-mono font-semibold text-[var(--color-loss)]">{gastosFijos.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Disponible</p>
            <p className={`font-mono font-semibold ${claseColorPorSigno(disponible)}`}>{disponible.toFixed(2)} €</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Balance por categoría
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : (
          <BalancePorCategoriaChart datos={balanceCategorias} />
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Evolución ({MESES_SERIE} meses)
        </h2>
        {loadingSerie ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : (
          <SerieTemporalChart datos={serieTemporal} />
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Últimos movimientos
        </h2>
        {movimientos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos este mes.</p>
        ) : (
          movimientos
            .slice(0, 8)
            .map((m) => (
              <MovimientoRow key={m.id} movimiento={m} subcategoria={subcategoriasPorId.get(m.subcategoria_id)} />
            ))
        )}
      </Card>
    </div>
  );
}
