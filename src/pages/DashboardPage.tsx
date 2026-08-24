import { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { EsteMesCard } from '../components/dashboard/EsteMesCard';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import {
  ahorroTotalDelMes,
  balanceNetoDelMes,
  gastoRealTotalDelMes,
  gastoVariableDelMes,
  inversionTotalDelMes,
  margenOperativoDelMes,
  tasaAhorroDelMes,
  tasaInversionDelMes,
} from '../lib/finance/metricas';
import { claseColorPorSigno } from '../components/charts/colors';

// Tasa de ahorro: verde si se ahorra "bien" (>30%), roja si es baja (<20%), blanca en medio.
function claseColorTasaAhorro(tasa: number | null): string {
  if (tasa === null) return '';
  if (tasa > 30) return 'text-[var(--color-gain)]';
  if (tasa < 20) return 'text-[var(--color-loss)]';
  return '';
}

// Tasa de inversion: verde por encima del 15%, roja por debajo (sin zona neutra).
function claseColorTasaInversion(tasa: number | null): string {
  if (tasa === null) return '';
  return tasa > 15 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]';
}

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const {
    ingresoReal,
    gastosFijos,
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
  const tasaAhorro = useMemo(() => tasaAhorroDelMes(ahorroTotal, ingresoReal), [ahorroTotal, ingresoReal]);
  const tasaInversion = useMemo(() => tasaInversionDelMes(inversionTotal, ingresoReal), [inversionTotal, ingresoReal]);
  const margenOperativo = useMemo(() => margenOperativoDelMes(ingresoReal, gastosFijos), [ingresoReal, gastosFijos]);

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const etiquetaMes = useMemo(() => hoy.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' }), [hoy]);

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
          <div className="grid grid-cols-2 gap-4">
            <StatTile label="Ingreso real" value={`${ingresoReal.toFixed(2)} €`} colorClassName="text-[var(--color-gain)]" />
            <StatTile label="Gastos totales" value={`${gastoRealTotal.toFixed(2)} €`} colorClassName="text-[var(--color-loss)]" />
            <StatTile label="Gastos fijos" value={`${gastosFijos.toFixed(2)} €`} colorClassName="text-[var(--color-loss)]" />
            <StatTile label="Gastos variables" value={`${gastoVariable.toFixed(2)} €`} colorClassName={claseColorPorSigno(-gastoVariable)} />
            <StatTile label="Balance neto" value={`${balanceNeto.toFixed(2)} €`} colorClassName={claseColorPorSigno(balanceNeto)} />
            <StatTile
              label="Operating margin"
              value={margenOperativo === null ? '—' : `${margenOperativo.toFixed(0)} %`}
              colorClassName={margenOperativo === null ? '' : claseColorPorSigno(margenOperativo)}
            />
            <StatTile label="Ahorro total" value={`${ahorroTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(ahorroTotal)} />
            <StatTile label="Inversión total" value={`${inversionTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(inversionTotal)} />
            <StatTile
              label="Tasa de ahorro"
              value={tasaAhorro === null ? '—' : `${tasaAhorro.toFixed(0)} %`}
              colorClassName={claseColorTasaAhorro(tasaAhorro)}
            />
            <StatTile
              label="Tasa de inversión"
              value={tasaInversion === null ? '—' : `${tasaInversion.toFixed(0)} %`}
              colorClassName={claseColorTasaInversion(tasaInversion)}
            />
          </div>
        )}
      </Card>

      <EsteMesCard etiquetaMes={etiquetaMes} balanceSubcategorias={balanceSubcategorias} loading={loading} />

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
