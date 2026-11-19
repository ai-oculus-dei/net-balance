import { useMemo } from 'react';
import { Card, CardTitle } from '../components/ui/Card';
import { Cargando } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { IconInicio, IconObjetivos } from '../components/layout/NavIcons';
import { IconLista } from '../components/icons/UiIcons';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { EsteMesCard } from '../components/dashboard/EsteMesCard';
import { MetricasCard } from '../components/dashboard/MetricasCard';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import { formatearImporte } from '../lib/finance/formato';

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const {
    movimientos,
    objetivosActivos,
    aportacionesDeseadas,
    mesEtiqueta,
    loading: loadingDisponible,
  } = useDisponibleMes(hoy);
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

  const etiquetaMes = useMemo(
    () => mesEtiqueta.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' }),
    [mesEtiqueta]
  );

  const loading = loadingDisponible || loadingTaxonomia;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<IconInicio />}
        title="Inicio"
        sub={loading ? 'cargando…' : `${etiquetaMes} · ${movimientos.length} movimientos`}
      />

      <MetricasCard
        titulo="Métricas del mes"
        movimientos={movimientos}
        subcategoriasPorId={subcategoriasPorId}
        loading={loading}
        destacada
      />

      <EsteMesCard titulo={`Este mes: ${etiquetaMes}`} balanceSubcategorias={balanceSubcategorias} loading={loading} />

      <Card>
        <CardTitle icon={<IconObjetivos />} className="mb-2">
          Ahorro mensual
        </CardTitle>
        {loadingDisponible ? (
          <Cargando />
        ) : objetivosActivos.length === 0 ? (
          <p className="empty">No tienes objetivos de ahorro activos.</p>
        ) : (
          <>
            {objetivosActivos.map((o) => {
              const importe = aportacionesDeseadas.find((a) => a.objetivoId === o.id)?.importe ?? 0;
              return (
                <div key={o.id} className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-line last:border-0">
                  <span className="text-sm truncate min-w-0">{o.nombre}</span>
                  <span className="font-mono text-sm font-semibold text-cyan shrink-0">{formatearImporte(importe)} €</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-2 pt-2.5 mt-1 border-t border-line-strong">
              <span className="kpi-label">Total</span>
              <span
                className="font-mono text-[15px] font-semibold text-cyan"
                style={{ textShadow: '0 0 12px color-mix(in srgb, var(--cyan) 35%, transparent)' }}
              >
                {formatearImporte(totalAhorroMensual)} €
              </span>
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardTitle icon={<IconLista />} className="mb-1">
          Últimos movimientos
        </CardTitle>
        {movimientos.length === 0 ? (
          <p className="empty">Sin movimientos este mes.</p>
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
