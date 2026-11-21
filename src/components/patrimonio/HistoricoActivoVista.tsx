import { useMemo, useState } from 'react';
import { GraficoTemporal, type MarcaGrafico } from '../charts/GraficoTemporal';
import { SelectorRango } from '../charts/SelectorRango';
import { useTheme } from '../../lib/theme/useTheme';
import { Segmented } from '../ui/Segmented';
import { activoCompletoParaHistorico, type ActivoAgrupado } from '../../lib/finance/patrimonio';
import { serieHistoricoActivo, type PrecioDiarioActivo, type VentaLote } from '../../lib/finance/historicoPrecioActivo';
import { RANGO_POR_DEFECTO, type RangoTemporal } from '../../lib/finance/rangosTemporales';
import { formatearImporte } from '../../lib/finance/formato';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

type Modo = 'precio' | 'valor';

interface HistoricoActivoVistaProps {
  activo: ActivoAgrupado;
  todasLasPosiciones: PosicionPatrimonio[];
  preciosHistoricos: PrecioDiarioActivo[];
  ventasLotes: VentaLote[];
  altura?: number;
  // Version pequena dentro de la tarjeta del activo: sin titulo (ya esta en la tarjeta) y sin
  // dejar hueco para el boton de cerrar de la pantalla completa.
  compacto?: boolean;
}

// Alto que ocupan, ademas del grafico, la fila del selector de periodo y la leyenda de compras.
const ALTO_CONTROLES = 72;

// Contenido de la pantalla completa que abre el icono de histórico de ActivoCard — pensado para
// pasarse tal cual como `render` de PantallaCompletaGrafico (misma forma que TarjetaGrafico).
export function HistoricoActivoVista({
  activo,
  todasLasPosiciones,
  preciosHistoricos,
  ventasLotes,
  altura,
  compacto = false,
}: HistoricoActivoVistaProps) {
  const { theme } = useTheme();
  const [modo, setModo] = useState<Modo>('precio');
  const [rango, setRango] = useState<RangoTemporal>(RANGO_POR_DEFECTO);

  const completo = useMemo(() => activoCompletoParaHistorico(activo, todasLasPosiciones), [activo, todasLasPosiciones]);

  const serie = useMemo(
    () => serieHistoricoActivo(completo, ventasLotes, preciosHistoricos),
    [completo, preciosHistoricos, ventasLotes]
  );

  const puntos = useMemo(
    () => serie.map((p) => ({ fecha: p.fecha, valores: { valor: modo === 'precio' ? p.precioUnitario : p.valorTotal } })),
    [serie, modo]
  );

  // Un punto por compra (incluidas las de lotes ya vendidos/archivados): en "Precio unitario",
  // al precio que se pago; en "Valor total", sobre la linea del valor en cartera ese dia (o el
  // primer dia con cotizacion despues, si se compro en fin de semana o festivo).
  const compras = useMemo<MarcaGrafico[]>(() => {
    return completo.lotes
      .map((lote) => {
        if (modo === 'precio') return { fecha: lote.fecha_compra, valor: lote.precio_compra_unitario };
        const punto = serie.find((p) => p.fecha >= lote.fecha_compra);
        return punto ? { fecha: punto.fecha, valor: punto.valorTotal } : null;
      })
      .filter((m): m is MarcaGrafico => m !== null);
  }, [completo, serie, modo]);

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center justify-between gap-2 mb-2 ${compacto ? '' : 'pr-12'}`}>
        {!compacto && (
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] truncate min-w-0">
            {activo.ticker ? `[${activo.ticker}] ${activo.nombre}` : activo.nombre}
          </h2>
        )}
        <Segmented
          size="sm"
          full={compacto}
          ariaLabel="Qué mostrar"
          value={modo}
          onChange={setModo}
          options={[
            { value: 'precio', label: 'Precio unitario' },
            { value: 'valor', label: 'Valor total' },
          ]}
        />
      </div>

      <div className={compacto ? 'mb-2' : 'mb-2 max-w-sm'}>
        <SelectorRango value={rango} onChange={setRango} />
      </div>

      {puntos.length === 0 ? (
        <p className="empty">
          Todavía no hay histórico de precio real para este activo — se rellena solo la próxima vez que se actualicen los precios.
        </p>
      ) : (
        <GraficoTemporal
          puntos={puntos}
          lineas={[{ id: 'valor', colorIndex: 0, etiqueta: modo === 'precio' ? 'Precio unitario' : 'Valor total' }]}
          rango={rango}
          theme={theme}
          altura={altura !== undefined ? Math.max(altura - ALTO_CONTROLES, 140) : undefined}
          marcas={compras}
          formatoValor={(v) => `${formatearImporte(v)} €`}
        />
      )}
    </div>
  );
}
