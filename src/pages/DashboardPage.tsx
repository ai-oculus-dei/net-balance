import { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { EsteMesCard } from '../components/dashboard/EsteMesCard';
import { MetricasCard } from '../components/dashboard/MetricasCard';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const { movimientos, objetivosActivos, aportacionesDeseadas, loading: loadingDisponible } = useDisponibleMes(hoy);
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const totalAhorroMensual = useMemo(
    () => Math.round(aportacionesDeseadas.reduce((suma, a) => suma + a.importe, 0) * 100) / 100,
    [aportacionesDeseadas]
  );

  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const etiquetaMes = useMemo(() => hoy.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' }), [hoy]);

  const loading = loadingDisponible || loadingTaxonomia;

  return (
    <div className="flex flex-col gap-4">
      <MetricasCard
        titulo="Métricas del mes"
        movimientos={movimientos}
        subcategoriasPorId={subcategoriasPorId}
        loading={loading}
      />

      <EsteMesCard titulo={`Este mes: ${etiquetaMes}`} balanceSubcategorias={balanceSubcategorias} loading={loading} />

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Ahorro mensual
        </h2>
        {loadingDisponible ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : objetivosActivos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No tienes objetivos de ahorro activos.</p>
        ) : (
          <>
            {objetivosActivos.map((o) => {
              const importe = aportacionesDeseadas.find((a) => a.objetivoId === o.id)?.importe ?? 0;
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0"
                >
                  <span className="text-sm">{o.nombre}</span>
                  <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                    {importe.toFixed(2)} €
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--color-border)]">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                {totalAhorroMensual.toFixed(2)} €
              </span>
            </div>
          </>
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
