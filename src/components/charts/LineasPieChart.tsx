import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colorCategorico } from './colorsCategoricos';
import { LEYENDA, TOOLTIP_CONTENT, TOOLTIP_ITEM } from './estiloGraficos';
import { formatearImporte } from '../../lib/finance/formato';
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
  altura?: number;
}

// Umbral por debajo del cual una porcion no lleva etiqueta de porcentaje: con hasta 8 lineas,
// las porciones finas quedan demasiado juntas y las etiquetas se amontonan/se solapan. Por
// debajo del umbral, la leyenda y el tooltip siguen dando el dato exacto (nunca desaparece,
// solo se deja de forzar un numero encima de una porcion sin sitio para el).
const UMBRAL_ETIQUETA = 0.06;

interface EtiquetaPorcentajeProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
}

function EtiquetaPorcentaje({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0 }: EtiquetaPorcentajeProps) {
  if (percent < UMBRAL_ETIQUETA) return null;
  const RADIAN = Math.PI / 180;
  const radio = outerRadius + 14;
  const x = cx + radio * Math.cos(-midAngle * RADIAN);
  const y = cy + radio * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="var(--muted)"
      fontSize={10}
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'}
      dominantBaseline="central"
    >
      {`${formatearImporte(percent * 100, 0)}%`}
    </text>
  );
}

export function LineasPieChart({ datos, theme, altura = 420 }: LineasPieChartProps) {
  if (datos.length === 0) {
    return <p className="empty">Selecciona al menos una categoría para comparar.</p>;
  }

  const datosConMagnitud = datos.map((d) => ({ ...d, magnitud: Math.abs(d.neto) }));
  const hayDatos = datosConMagnitud.some((d) => d.magnitud > 0);

  if (!hayDatos) {
    return <p className="empty">Sin movimientos en ese rango para estas líneas.</p>;
  }

  // Hasta 8 lineas con etiquetas largas pueden ocupar varias filas de leyenda: se deja hueco
  // fijo debajo de la tarta (cy por encima del centro) en vez de dejar que Recharts superponga
  // la leyenda sobre las etiquetas de porcentaje.
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <Pie
          data={datosConMagnitud}
          dataKey="magnitud"
          nameKey="etiqueta"
          cx="50%"
          cy="42%"
          outerRadius={105}
          innerRadius={64}
          paddingAngle={2}
          cornerRadius={4}
          stroke="var(--card-solid)"
          strokeWidth={2}
          isAnimationActive={false}
          label={EtiquetaPorcentaje}
          labelLine={false}
        >
          {datosConMagnitud.map((d) => (
            <Cell key={d.id} fill={colorCategorico(d.colorIndex, theme)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(_value, _name, item) => [`${formatearImporte((item.payload as { neto: number }).neto)} €`, item.payload.etiqueta]}
          contentStyle={TOOLTIP_CONTENT}
          itemStyle={TOOLTIP_ITEM}
        />
        <Legend verticalAlign="bottom" align="center" wrapperStyle={LEYENDA} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
