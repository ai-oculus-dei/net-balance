import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLOR_GAIN, COLOR_LOSS } from './colors';

export interface BalanceCategoria {
  categoria: string;
  neto: number;
}

export function BalancePorCategoriaChart({ datos }: { datos: BalanceCategoria[] }) {
  if (datos.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos este mes.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)} €`}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }}
        />
        <Bar dataKey="neto" radius={[4, 4, 0, 0]}>
          {datos.map((d) => (
            <Cell key={d.categoria} fill={d.neto < 0 ? COLOR_LOSS : COLOR_GAIN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
