import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LineaSelectorRow } from '../components/visualizaciones/LineaSelectorRow';
import { SerieTemporalLineasChart } from '../components/charts/SerieTemporalLineasChart';
import { LineasPieChart } from '../components/charts/LineasPieChart';
import { MAX_LINEAS } from '../components/charts/colorsCategoricos';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTheme } from '../lib/theme/useTheme';
import { formatearMes, parseMes, rangoEntreMeses } from '../lib/finance/fechas';
import { indexarSubcategorias } from '../lib/finance/taxonomia';
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

function nuevaLinea(lineasActuales: LineaSeleccion[]): LineaSeleccion {
  return {
    id: crypto.randomUUID(),
    colorIndex: siguienteColorIndexLibre(lineasActuales),
    categoriaId: null,
    subcategoriaId: null,
  };
}

export function VisualizacionesPage() {
  const hoy = useMemo(() => new Date(), []);
  const [desdeMes, setDesdeMes] = useState(() => formatearMes(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)));
  const [hastaMes, setHastaMes] = useState(() => formatearMes(hoy));
  const [lineas, setLineas] = useState<LineaSeleccion[]>(() => [nuevaLinea([])]);

  const { theme } = useTheme();
  const { categorias, subcategorias, subcategoriasDe, loading: loadingTaxonomia } = useTaxonomia();
  const rango = useMemo(() => rangoEntreMeses(desdeMes, hastaMes), [desdeMes, hastaMes]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

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

  function actualizarLinea(id: string, cambios: Partial<LineaSeleccion>) {
    setLineas((actuales) => actuales.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(id: string) {
    setLineas((actuales) => actuales.filter((l) => l.id !== id));
  }

  function anadirLinea() {
    setLineas((actuales) => (actuales.length >= MAX_LINEAS ? actuales : [...actuales, nuevaLinea(actuales)]));
  }

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

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Categorías a comparar
          </h2>
          {lineas.length >= MAX_LINEAS && (
            <span className="text-xs text-[var(--color-text-muted)]">Máximo {MAX_LINEAS} líneas</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {lineas.map((linea) => (
            <LineaSelectorRow
              key={linea.id}
              linea={linea}
              categorias={categorias}
              subcategoriasDe={subcategoriasDe}
              theme={theme}
              onChangeCategoria={(categoriaId) => actualizarLinea(linea.id, { categoriaId, subcategoriaId: null })}
              onChangeSubcategoria={(subcategoriaId) => actualizarLinea(linea.id, { subcategoriaId })}
              onRemove={() => quitarLinea(linea.id)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={anadirLinea}
          disabled={lineas.length >= MAX_LINEAS}
        >
          + Añadir categoría
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Evolución mensual
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : (
          <SerieTemporalLineasChart datos={serieTemporal} lineas={lineasInfo} theme={theme} />
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
          Reparto del total ({desdeMes} a {hastaMes})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : (
          <LineasPieChart datos={datosPie} theme={theme} />
        )}
      </Card>
    </div>
  );
}
