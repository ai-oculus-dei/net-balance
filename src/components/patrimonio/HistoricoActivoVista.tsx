import { useMemo, useState } from 'react';
import { SerieTemporalLineasChart } from '../charts/SerieTemporalLineasChart';
import { useTheme } from '../../lib/theme/useTheme';
import { activoCompletoParaHistorico, etiquetaFecha, type ActivoAgrupado } from '../../lib/finance/patrimonio';
import { serieHistoricoActivo, type PrecioDiarioActivo, type VentaLote } from '../../lib/finance/historicoPrecioActivo';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

type Modo = 'precio' | 'valor';

interface HistoricoActivoVistaProps {
  activo: ActivoAgrupado;
  todasLasPosiciones: PosicionPatrimonio[];
  preciosHistoricos: PrecioDiarioActivo[];
  ventasLotes: VentaLote[];
  altura?: number;
}

// Contenido de la pantalla completa que abre el icono de histórico de ActivoCard — pensado para
// pasarse tal cual como `render` de PantallaCompletaGrafico (misma forma que TarjetaGrafico).
export function HistoricoActivoVista({
  activo,
  todasLasPosiciones,
  preciosHistoricos,
  ventasLotes,
  altura,
}: HistoricoActivoVistaProps) {
  const { theme } = useTheme();
  const [modo, setModo] = useState<Modo>('precio');

  const serie = useMemo(() => {
    const completo = activoCompletoParaHistorico(activo, todasLasPosiciones);
    return serieHistoricoActivo(completo, ventasLotes, preciosHistoricos);
  }, [activo, todasLasPosiciones, preciosHistoricos, ventasLotes]);

  const datos = serie.map((p) => ({
    mes: etiquetaFecha(p.fecha),
    valores: { valor: modo === 'precio' ? p.precioUnitario : p.valorTotal },
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-2 pr-12">
        <h2 className="text-sm font-semibold truncate">{activo.ticker ? `[${activo.ticker}] ${activo.nombre}` : activo.nombre}</h2>
        <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo('precio')}
            aria-pressed={modo === 'precio'}
            className={`px-2.5 py-1 ${modo === 'precio' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Precio unitario
          </button>
          <button
            type="button"
            onClick={() => setModo('valor')}
            aria-pressed={modo === 'valor'}
            className={`px-2.5 py-1 ${modo === 'valor' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Valor total
          </button>
        </div>
      </div>

      {datos.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Todavía no hay histórico de precio real para este activo — se rellena solo la próxima vez que se actualicen los precios.
        </p>
      ) : (
        <SerieTemporalLineasChart
          datos={datos}
          lineas={[{ id: 'valor', colorIndex: 0, etiqueta: modo === 'precio' ? 'Precio unitario' : 'Valor total' }]}
          theme={theme}
          altura={altura}
        />
      )}
    </div>
  );
}
