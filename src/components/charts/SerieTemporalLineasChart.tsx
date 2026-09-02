import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorCategorico } from './colorsCategoricos';
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
}

export function SerieTemporalLineasChart({ datos, lineas, theme, altura = 280 }: SerieTemporalLineasChartProps) {
  if (lineas.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Selecciona al menos una categoría para comparar.</p>;
  }

  // Recharts necesita las claves de "valores" al nivel raiz de cada punto.
  const datosAplanados = datos.map((p) => ({ mes: p.mes, ...p.valores }));

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={datosAplanados} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          tickFormatter={(value) => formatearImporte(Number(value), 0)}
        />
        <Tooltip
          formatter={(value) => `${formatearImporte(Number(value))} €`}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }}
        />
        {lineas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lineas.map((linea) => (
          <Line
            key={linea.id}
            type="monotone"
            dataKey={linea.id}
            name={linea.etiqueta}
            stroke={colorCategorico(linea.colorIndex, theme)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
