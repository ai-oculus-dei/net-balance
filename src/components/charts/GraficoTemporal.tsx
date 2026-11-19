import { useId, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { colorCategorico } from './colorsCategoricos';
import { LEYENDA, TICK, TOOLTIP_CONTENT, TOOLTIP_ITEM, TOOLTIP_LABEL } from './estiloGraficos';
import type { SerieLineaInfo } from './SerieTemporalLineasChart';
import { formatearImporte } from '../../lib/finance/formato';
import {
  filtrarPorRango,
  formatoEjeRango,
  ticksEje,
  timestampDia,
  type RangoTemporal,
} from '../../lib/finance/rangosTemporales';
import type { PuntoDiario } from '../../lib/finance/patrimonio';
import type { Theme } from '../../lib/theme/ThemeProvider';

export interface MarcaGrafico {
  fecha: string; // "YYYY-MM-DD"
  valor: number;
}

interface GraficoTemporalProps {
  puntos: PuntoDiario[]; // serie diaria completa: el filtro de rango se aplica aqui
  lineas: SerieLineaInfo[];
  rango: RangoTemporal;
  theme: Theme;
  altura?: number;
  // Puntos destacados sobre la serie (p.ej. las compras de un activo).
  marcas?: MarcaGrafico[];
  etiquetaMarcas?: string;
  // Formato de los valores en el tooltip (por defecto "1,234.56 €").
  formatoValor?: (v: number) => string;
}

const formatoEuros = (v: number) => `${formatearImporte(v)} €`;

// Serie temporal diaria con eje X de fechas real (escala de tiempo, no categorias) y filtro de
// rango tipo broker (1D, 1W, 1M, 6M, 1Y, 5Y).
export function GraficoTemporal({
  puntos,
  lineas,
  rango,
  theme,
  altura = 280,
  marcas = [],
  etiquetaMarcas = 'Compras',
  formatoValor = formatoEuros,
}: GraficoTemporalProps) {
  const idGradiente = `area-${useId().replace(/:/g, '')}`;

  const datos = useMemo(
    () => filtrarPorRango(puntos, rango).map((p) => ({ t: timestampDia(p.fecha), ...p.valores })),
    [puntos, rango]
  );
  const marcasVisibles = useMemo(() => filtrarPorRango(marcas, rango), [marcas, rango]);

  if (lineas.length === 0) {
    return <p className="empty">Todavía no hay histórico.</p>;
  }
  if (datos.length === 0) {
    return <p className="empty">Sin datos en este periodo.</p>;
  }

  const min = datos[0].t;
  const max = datos[datos.length - 1].t;
  const formatoEje = formatoEjeRango(rango);
  const unaSola = lineas.length === 1;
  const colorUnica = unaSola ? colorCategorico(lineas[0].colorIndex, theme) : undefined;
  const colorMarcas = 'var(--violet)';

  return (
    <div className={unaSola ? 'chart-glow' : ''}>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={datos} margin={{ top: 8, right: 22, left: 0, bottom: 4 }}>
          {unaSola && (
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorUnica} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colorUnica} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 4" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[min, max]}
            ticks={ticksEje(min, max, rango, 4)}
            tickFormatter={formatoEje}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            allowDataOverflow
          />
          <YAxis
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            // Una sola serie (precio de una accion, valor de un activo): escala ajustada a sus
            // valores, como en un broker; con varias, desde 0 para poder compararlas.
            domain={unaSola ? ['auto', 'auto'] : [0, 'auto']}
            tickFormatter={(value) => formatearImporte(Number(value), 0)}
          />
          <Tooltip
            labelFormatter={(t) =>
              new Date(Number(t)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            }
            formatter={(value) => formatoValor(Number(value))}
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
            cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 3' }}
          />
          {lineas.length > 1 && <Legend wrapperStyle={LEYENDA} iconType="circle" iconSize={8} />}
          {unaSola && (
            <Area
              type="monotone"
              dataKey={lineas[0].id}
              stroke="none"
              fill={`url(#${idGradiente})`}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
              activeDot={false}
            />
          )}
          {lineas.map((linea) => (
            <Line
              key={linea.id}
              type="monotone"
              dataKey={linea.id}
              name={linea.etiqueta}
              stroke={colorCategorico(linea.colorIndex, theme)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
          {marcasVisibles.map((m, i) => (
            <ReferenceDot
              key={`${m.fecha}-${i}`}
              x={timestampDia(m.fecha)}
              y={m.valor}
              r={5}
              fill={colorMarcas}
              stroke="var(--card-solid)"
              strokeWidth={2}
              ifOverflow="extendDomain"
              style={{ filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--violet) 70%, transparent))' }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {marcasVisibles.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 mt-1 font-mono text-[11px] text-muted">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: colorMarcas, boxShadow: '0 0 6px var(--violet)' }}
            aria-hidden="true"
          />
          {etiquetaMarcas} ({marcasVisibles.length})
        </p>
      )}
    </div>
  );
}
