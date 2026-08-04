import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLOR_GAIN, COLOR_LOSS } from './colors';

export interface PuntoSerieTemporal {
  mes: string; // etiqueta corta, ej. "ene 26"
  ingresos: number;
  gastos: number; // magnitud positiva
}

export function SerieTemporalChart({ datos }: { datos: PuntoSerieTemporal[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={datos} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)} €`}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }}
        />
        <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke={COLOR_GAIN} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="gastos" name="Gastos" stroke={COLOR_LOSS} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
