import { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import {
  ahorroTotalDelMes,
  balanceNetoDelMes,
  gastoRealTotalDelMes,
  gastoVariableDelMes,
  inversionTotalDelMes,
  tasaAhorroDelMes,
} from '../lib/finance/metricas';
import { claseColorPorSigno } from '../components/charts/colors';

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const {
    ingresoReal,
    gastosFijos,
    disponible,
    movimientos,
    objetivosActivos,
    aportacionesDeseadas,
    loading: loadingDisponible,
  } = useDisponibleMes(hoy);
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const totalAhorroMensual = useMemo(
    () => Math.round(aportacionesDeseadas.reduce((suma, a) => suma + a.importe, 0) * 100) / 100,
    [aportacionesDeseadas]
  );

  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const balanceNeto = useMemo(() => balanceNetoDelMes(movimientos), [movimientos]);
  const ahorroTotal = useMemo(() => ahorroTotalDelMes(movimientos, subcategoriasPorId), [movimientos, subcategoriasPorId]);
  const inversionTotal = useMemo(
    () => inversionTotalDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const gastoRealTotal = useMemo(
    () => gastoRealTotalDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const gastoVariable = useMemo(() => gastoVariableDelMes(gastoRealTotal, gastosFijos), [gastoRealTotal, gastosFijos]);
  const tasaAhorro = useMemo(
    () => tasaAhorroDelMes(ahorroTotal, inversionTotal, ingresoReal),
    [ahorroTotal, inversionTotal, ingresoReal]
  );

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const loading = loadingDisponible || loadingTaxonomia;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
          Métricas del mes
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Ingreso real" value={`${ingresoReal.toFixed(2)} €`} colorClassName="text-[var(--color-gain)]" />
            <StatTile label="Gastos fijos" value={`${gastosFijos.toFixed(2)} €`} colorClassName="text-[var(--color-loss)]" />
            <StatTile label="Gasto variable" value={`${gastoVariable.toFixed(2)} €`} colorClassName={claseColorPorSigno(-gastoVariable)} />
            <StatTile label="Disponible" value={`${disponible.toFixed(2)} €`} colorClassName={claseColorPorSigno(disponible)} />
            <StatTile label="Balance neto" value={`${balanceNeto.toFixed(2)} €`} colorClassName={claseColorPorSigno(balanceNeto)} />
            <StatTile label="Ahorro total" value={`${ahorroTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(ahorroTotal)} />
            <StatTile label="Inversión total" value={`${inversionTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(inversionTotal)} />
            <StatTile
              label="Tasa de ahorro"
              value={tasaAhorro === null ? '—' : `${tasaAhorro.toFixed(0)} %`}
              colorClassName={tasaAhorro === null ? '' : claseColorPorSigno(tasaAhorro)}
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Este mes
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : balanceSubcategorias.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos este mes.</p>
        ) : (
          balanceSubcategorias.map((linea, indice) => {
            const nuevaCategoria = indice === 0 || balanceSubcategorias[indice - 1].categoriaId !== linea.categoriaId;
            return (
              <div key={linea.subcategoriaId}>
                {nuevaCategoria && (
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mt-3 first:mt-0">
                    {linea.categoria}
                  </p>
                )}
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-sm">{linea.subcategoria}</span>
                  <span className={`font-mono text-sm font-semibold ${claseColorPorSigno(linea.neto)}`}>
                    {linea.neto > 0 ? '+' : ''}
                    {linea.neto.toFixed(2)} €
                  </span>
                </div>
              </div>
            );
          })
        )}
      </Card>

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
