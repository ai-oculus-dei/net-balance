import { useId } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorCategorico } from './colorsCategoricos';
import { LEYENDA, TICK, TOOLTIP_CONTENT, TOOLTIP_ITEM, TOOLTIP_LABEL } from './estiloGraficos';
import { formatearImporte } from '../../lib/finance/formato';
import type { PuntoSerieLineas } from '../../lib/finance/visualizaciones';
import type { Theme } from '../../lib/theme/ThemeProvider';

export interface SerieLineaInfo {
  id: string;
  colorIndex: number;
  etiqueta: string;
}

interface SerieTemporalLineasChartProps {
  datos: PuntoSerieLineas[];
  lineas: SerieLineaInfo[];
  theme: Theme;
  altura?: number;
  // 'lineal': tramos rectos entre puntos (sin suavizar), con un punto en cada valor.
  curva?: 'suave' | 'lineal';
}

export function SerieTemporalLineasChart({ datos, lineas, theme, altura = 280, curva = 'suave' }: SerieTemporalLineasChartProps) {
  const tipoCurva = curva === 'lineal' ? 'linear' : 'monotone';
  const idGradiente = `area-${useId().replace(/:/g, '')}`;

  if (lineas.length === 0) {
    return <p className="empty">Selecciona al menos una categoría para comparar.</p>;
  }

  // Recharts necesita las claves de "valores" al nivel raiz de cada punto.
  const datosAplanados = datos.map((p) => ({ mes: p.mes, ...p.valores }));
  // Con una sola serie (historicos de patrimonio), linea principal con brillo y area en
  // degradado debajo; con varias, solo lineas para no mezclar rellenos.
  const unaSola = lineas.length === 1;
  const colorUnica = unaSola ? colorCategorico(lineas[0].colorIndex, theme) : undefined;

  return (
    <div className={unaSola ? 'chart-glow' : ''}>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={datosAplanados} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
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
            dataKey="mes"
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            minTickGap={12}
          />
          <YAxis
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value) => formatearImporte(Number(value), 0)}
          />
          <Tooltip
            formatter={(value) => `${formatearImporte(Number(value))} €`}
            contentStyle={TOOLTIP_CONTENT}
            labelStyle={TOOLTIP_LABEL}
            itemStyle={TOOLTIP_ITEM}
            cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 3' }}
          />
          {lineas.length > 1 && <Legend wrapperStyle={LEYENDA} iconType="circle" iconSize={8} />}
          {unaSola && (
            <Area
              type={tipoCurva}
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
              type={tipoCurva}
              dataKey={linea.id}
              name={linea.etiqueta}
              stroke={colorCategorico(linea.colorIndex, theme)}
              strokeWidth={2}
              dot={curva === 'lineal' ? { r: 2.5, strokeWidth: 0, fill: colorCategorico(linea.colorIndex, theme) } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
