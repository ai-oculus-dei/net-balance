import { useMemo, useState } from 'react';
import { useDebounced } from '../hooks/useDebounced';
import { Card, CardTitle } from '../components/ui/Card';
import { Cargando } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { IconVisualizaciones } from '../components/layout/NavIcons';
import { IconActividad, IconCalendario, IconCapas, IconCheck, IconInfo, IconPapelera, IconPlus, IconTarta, IconX } from '../components/icons/UiIcons';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SerieTemporalLineasChart } from '../components/charts/SerieTemporalLineasChart';
import { LineasPieChart } from '../components/charts/LineasPieChart';
import { TarjetaGrafico } from '../components/charts/TarjetaGrafico';
import { MAX_LINEAS, colorCategorico } from '../components/charts/colorsCategoricos';
import { MetricasCard } from '../components/dashboard/MetricasCard';
import { EsteMesCard, type SeleccionCategorias } from '../components/dashboard/EsteMesCard';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { useMovimientos } from '../hooks/useMovimientos';
import { useAnclasPeriodo } from '../hooks/useAnclasPeriodo';
import { useTheme } from '../lib/theme/useTheme';
import { useVisualizacionesState } from '../lib/visualizaciones/useVisualizacionesState';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import { periodosEntre, resolverRangoEntreMeses } from '../lib/finance/periodos';
import { formatearImporte } from '../lib/finance/formato';
import {
  etiquetaLinea,
  lineaEsValida,
  serieTemporalPorLineas,
  signoEvolucionMensual,
  totalesPorLinea,
  type LineaSeleccion,
} from '../lib/finance/visualizaciones';

function siguienteColorIndexLibre(lineas: LineaSeleccion[]): number {
  const usados = new Set(lineas.map((l) => l.colorIndex));
  for (let i = 0; i < MAX_LINEAS; i++) {
    if (!usados.has(i)) return i;
  }
  return 0;
}

export function VisualizacionesPage() {
  // Vive en un contexto montado en AppShell (no en esta pagina): asi la seleccion sobrevive a
  // cambiar de pestaña, pero se pierde si se cierra/recarga la app (no se persiste a proposito).
  const { desdeMes, hastaMes, lineas, setDesdeMes, setHastaMes, setLineas } = useVisualizacionesState();
  const [modoSeleccion, setModoSeleccion] = useState(false);

  const { theme } = useTheme();
  const { categorias, subcategorias, loading: loadingTaxonomia } = useTaxonomia();
  const { anclas, loading: loadingAnclas } = useAnclasPeriodo();
  const rango = useMemo(
    () => resolverRangoEntreMeses(anclas, desdeMes, hastaMes),
    [anclas, desdeMes, hastaMes]
  );
  const periodos = useMemo(() => periodosEntre(anclas, desdeMes, hastaMes), [anclas, desdeMes, hastaMes]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const lineasValidas = useMemo(() => lineas.filter(lineaEsValida), [lineas]);

  // La seleccion (lista de "Categorías a comparar" y el resaltado en "Resumen Categorías") se
  // mantiene instantanea sobre `lineas`. Los graficos, en cambio, son caros de recalcular y
  // volver a pintar (Recharts) — se recalculan 4s despues del ultimo cambio de seleccion, para
  // que pulsar varias categorias seguidas no se sienta lento.
  const lineasValidasGrafico = useDebounced(lineasValidas, 4000);

  // Gastos en positivo: se da la vuelta al signo de todo menos ingresos y ahorro/inversion (ver
  // signoEvolucionMensual).
  const serieTemporal = useMemo(
    () =>
      serieTemporalPorLineas(movimientos, lineasValidasGrafico, subcategoriasPorId, periodos, (m) =>
        signoEvolucionMensual(m, subcategoriasPorId)
      ),
    [movimientos, lineasValidasGrafico, subcategoriasPorId, periodos]
  );

  const totales = useMemo(
    () => totalesPorLinea(movimientos, lineasValidas, subcategoriasPorId),
    [movimientos, lineasValidas, subcategoriasPorId]
  );

  const totalesGrafico = useMemo(
    () => totalesPorLinea(movimientos, lineasValidasGrafico, subcategoriasPorId),
    [movimientos, lineasValidasGrafico, subcategoriasPorId]
  );

  const lineasInfo = lineasValidasGrafico.map((linea) => ({
    id: linea.id,
    colorIndex: linea.colorIndex,
    etiqueta: etiquetaLinea(linea, categorias, subcategorias),
  }));

  const datosPie = lineasInfo.map((info) => ({
    ...info,
    neto: totalesGrafico.find((t) => t.lineaId === info.id)?.total ?? 0,
  }));

  const totalSeleccion = totales.reduce((suma, t) => suma + t.total, 0);
  const mediaMensualSeleccion = totalSeleccion / (periodos.length > 0 ? periodos.length : 1);

  function quitarLinea(id: string) {
    setLineas((actuales) => actuales.filter((l) => l.id !== id));
  }

  function toggleSeleccion(categoriaId: number, subcategoriaId: number | null) {
    setLineas((actuales) => {
      const existente = actuales.find((l) => l.categoriaId === categoriaId && l.subcategoriaId === subcategoriaId);
      if (existente) return actuales.filter((l) => l.id !== existente.id);
      if (actuales.length >= MAX_LINEAS) return actuales;
      return [...actuales, { id: crypto.randomUUID(), colorIndex: siguienteColorIndexLibre(actuales), categoriaId, subcategoriaId }];
    });
  }

  function seleccionarTodasCategorias() {
    setLineas(() =>
      categorias.slice(0, MAX_LINEAS).map((c, indice) => ({
        id: crypto.randomUUID(),
        colorIndex: indice,
        categoriaId: c.id,
        subcategoriaId: null,
      }))
    );
  }

  const seleccion: SeleccionCategorias = {
    activa: modoSeleccion,
    estaSeleccionada: (categoriaId, subcategoriaId) =>
      lineas.some((l) => l.categoriaId === categoriaId && l.subcategoriaId === subcategoriaId),
    colorDe: (categoriaId, subcategoriaId) => {
      const linea = lineas.find((l) => l.categoriaId === categoriaId && l.subcategoriaId === subcategoriaId);
      return linea ? colorCategorico(linea.colorIndex, theme) : undefined;
    },
    onToggle: toggleSeleccion,
  };

  const loading = loadingTaxonomia || loadingMovimientos || loadingAnclas;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<IconVisualizaciones />}
        title="Visualizaciones"
        sub={`${desdeMes} → ${hastaMes} · ${periodos.length} ${periodos.length === 1 ? 'mes' : 'meses'}`}
      />

      <Card>
        <CardTitle icon={<IconCalendario />} className="mb-3">
          Rango de meses
        </CardTitle>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Desde" type="month" value={desdeMes} onChange={(e) => setDesdeMes(e.target.value)} />
          <Input label="Hasta" type="month" value={hastaMes} onChange={(e) => setHastaMes(e.target.value)} />
        </div>
      </Card>

      <MetricasCard
        titulo={`Métricas (${desdeMes} a ${hastaMes})`}
        movimientos={movimientos}
        subcategoriasPorId={subcategoriasPorId}
        loading={loading}
      />

      <EsteMesCard
        titulo="Resumen Categorías"
        balanceSubcategorias={balanceSubcategorias}
        loading={loading}
        seleccion={seleccion}
        mesesEnRango={periodos.length}
      />

      <Card glow={modoSeleccion}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <CardTitle icon={<IconCapas />}>Categorías a comparar</CardTitle>
          {lineas.length >= MAX_LINEAS && <span className="tag shrink-0">máx. {MAX_LINEAS}</span>}
        </div>

        {lineas.length > 0 && (
          <>
            <div className="flex flex-col mb-3">
              {lineas.map((linea) => {
                const color = colorCategorico(linea.colorIndex, theme);
                return (
                  <div key={linea.id} className="flex items-center gap-2.5 py-1.5 border-b border-dashed border-line last:border-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0 text-sm truncate">{etiquetaLinea(linea, categorias, subcategorias)}</span>
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea.id)}
                      aria-label="Quitar línea"
                      className="icon-btn shrink-0 !w-7 !h-7"
                    >
                      <IconX />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 mb-3 pt-2.5 border-t border-line-strong">
              <span className="kpi-label shrink-0">Total</span>
              <span className="font-mono text-sm font-semibold whitespace-nowrap">
                {formatearImporte(totalSeleccion)} € <span className="text-faint">·</span>{' '}
                <span className="text-muted">{formatearImporte(mediaMensualSeleccion)} €/m</span>
              </span>
            </div>
          </>
        )}

        {modoSeleccion && (
          <p className="notice mb-3">
            <IconInfo />
            Pulsa los nombres en «Resumen Categorías» de arriba para (des)seleccionarlos.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant={modoSeleccion ? 'primary' : 'secondary'}
            className="flex-1"
            onClick={() => setModoSeleccion((m) => !m)}
            aria-pressed={modoSeleccion}
          >
            {modoSeleccion ? <IconCheck /> : <IconPlus />}
            {modoSeleccion ? 'Hecho' : 'Añadir categoría'}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={seleccionarTodasCategorias}>
            Seleccionar todas
          </Button>
        </div>
      </Card>

      <TarjetaGrafico
        titulo="Evolución mensual"
        icono={<IconActividad />}
        render={(altura) =>
          loading ? (
            <Cargando />
          ) : (
            <SerieTemporalLineasChart datos={serieTemporal} lineas={lineasInfo} theme={theme} altura={altura} curva="lineal" />
          )
        }
      />

      <TarjetaGrafico
        titulo={`Reparto del total (${desdeMes} a ${hastaMes})`}
        icono={<IconTarta />}
        render={(altura) =>
          loading ? (
            <Cargando />
          ) : (
            <LineasPieChart datos={datosPie} theme={theme} altura={altura} />
          )
        }
      />

      {lineas.length > 0 && (
        <Button type="button" variant="danger" onClick={() => setLineas([])}>
          <IconPapelera />
          Borrar todas las líneas
        </Button>
      )}
    </div>
  );
}
