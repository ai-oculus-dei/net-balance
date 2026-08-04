import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colorCategorico } from './colorsCategoricos';
import type { Theme } from '../../lib/theme/ThemeProvider';

export interface DatoPieLinea {
  id: string;
  colorIndex: number;
  etiqueta: string;
  neto: number; // total con signo del rango completo
}

interface LineasPieChartProps {
  datos: DatoPieLinea[];
  theme: Theme;
}

export function LineasPieChart({ datos, theme }: LineasPieChartProps) {
  if (datos.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Selecciona al menos una categoría para comparar.</p>;
  }

  const datosConMagnitud = datos.map((d) => ({ ...d, magnitud: Math.abs(d.neto) }));
  const hayDatos = datosConMagnitud.some((d) => d.magnitud > 0);

  if (!hayDatos) {
    return <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos en ese rango para estas líneas.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={datosConMagnitud}
          dataKey="magnitud"
          nameKey="etiqueta"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {datosConMagnitud.map((d) => (
            <Cell key={d.id} fill={colorCategorico(d.colorIndex, theme)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(_value, _name, item) => [`${(item.payload as { neto: number }).neto.toFixed(2)} €`, item.payload.etiqueta]}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
