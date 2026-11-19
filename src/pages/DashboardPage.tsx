import { useMemo } from 'react';
import { Card, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { IconInicio } from '../components/layout/NavIcons';
import { IconLista } from '../components/icons/UiIcons';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { EsteMesCard } from '../components/dashboard/EsteMesCard';
import { MetricasCard } from '../components/dashboard/MetricasCard';
import { useMesActual } from '../hooks/useMesActual';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), []);
  const { movimientos, mesEtiqueta, loading: loadingMes } = useMesActual(hoy);
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();

  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const etiquetaMes = useMemo(
    () => mesEtiqueta.toLocaleDateString('es-ES', { month: 'long', year: '2-digit' }),
    [mesEtiqueta]
  );

  const loading = loadingMes || loadingTaxonomia;

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
