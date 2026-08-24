import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
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
import { useTheme } from '../lib/theme/useTheme';
import { useVisualizacionesState } from '../lib/visualizaciones/useVisualizacionesState';
import { parseMes, rangoEntreMeses } from '../lib/finance/fechas';
import { balancePorSubcategoria, indexarSubcategorias } from '../lib/finance/taxonomia';
import {
  etiquetaLinea,
  lineaEsValida,
  serieTemporalPorLineas,
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
  const rango = useMemo(() => rangoEntreMeses(desdeMes, hastaMes), [desdeMes, hastaMes]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const balanceSubcategorias = useMemo(
    () => balancePorSubcategoria(movimientos, subcategoriasPorId, categorias),
    [movimientos, subcategoriasPorId, categorias]
  );

  const lineasValidas = useMemo(() => lineas.filter(lineaEsValida), [lineas]);

  const serieTemporal = useMemo(
    () => serieTemporalPorLineas(movimientos, lineasValidas, subcategoriasPorId, parseMes(desdeMes), parseMes(hastaMes)),
    [movimientos, lineasValidas, subcategoriasPorId, desdeMes, hastaMes]
  );

  const totales = useMemo(
    () => totalesPorLinea(movimientos, lineasValidas, subcategoriasPorId),
    [movimientos, lineasValidas, subcategoriasPorId]
  );

  const lineasInfo = lineasValidas.map((linea) => ({
    id: linea.id,
    colorIndex: linea.colorIndex,
    etiqueta: etiquetaLinea(linea, categorias, subcategorias),
  }));

  const datosPie = lineasInfo.map((info) => ({
    ...info,
    neto: totales.find((t) => t.lineaId === info.id)?.total ?? 0,
  }));

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

  const loading = loadingTaxonomia || loadingMovimientos;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
          Rango de meses
        </h2>
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
      />

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Categorías a comparar
          </h2>
          {lineas.length >= MAX_LINEAS && (
            <span className="text-xs text-[var(--color-text-muted)]">Máximo {MAX_LINEAS} líneas</span>
          )}
        </div>

        {lineas.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {lineas.map((linea) => (
              <div key={linea.id} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colorCategorico(linea.colorIndex, theme) }}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0 text-sm truncate">{etiquetaLinea(linea, categorias, subcategorias)}</span>
                <button
                  type="button"
                  onClick={() => quitarLinea(linea.id)}
                  aria-label="Quitar línea"
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {modoSeleccion && (
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
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
            {modoSeleccion ? 'Hecho' : '+ Añadir categoría'}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={seleccionarTodasCategorias}>
            Seleccionar todas
          </Button>
        </div>
      </Card>

      <TarjetaGrafico
        titulo="Evolución mensual"
        render={(altura) =>
          loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : (
            <SerieTemporalLineasChart datos={serieTemporal} lineas={lineasInfo} theme={theme} altura={altura} />
          )
        }
      />

      <TarjetaGrafico
        titulo={`Reparto del total (${desdeMes} a ${hastaMes})`}
        render={(altura) =>
          loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : (
            <LineasPieChart datos={datosPie} theme={theme} altura={altura} />
          )
        }
      />

      {lineas.length > 0 && (
        <Button type="button" variant="danger" onClick={() => setLineas([])}>
          Borrar todas las líneas
        </Button>
      )}
    </div>
  );
}
