import { useMemo } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { ProgressRing } from '../ui/ProgressRing';
import { Cargando } from '../ui/Spinner';
import { IconMedidor } from '../icons/UiIcons';
import { StatTile } from '../ui/StatTile';
import { claseColorPorSigno } from '../charts/colors';
import { calcularMetricas, type FilaDesglose } from '../../lib/finance/bolsas';
import type { SubcategoriasPorId } from '../../lib/finance/taxonomia';
import { formatearImporte } from '../../lib/finance/formato';
import type { Movimiento } from '../../lib/supabase/database.types';

function comoFilas(desglose: FilaDesglose[]) {
  return desglose.map((d) => ({ etiqueta: d.etiqueta, valor: `${formatearImporte(d.valor)} €` }));
}

// Tasa de ahorro: verde si se ahorra "bien" (>30%), roja si es baja (<20%), blanca en medio.
function claseColorTasaAhorro(tasa: number | null): string {
  if (tasa === null) return '';
  if (tasa > 30) return 'text-ok';
  if (tasa < 20) return 'text-bad';
  return '';
}

// Tasa de inversion: verde por encima del 15%, roja por debajo (sin zona neutra).
function claseColorTasaInversion(tasa: number | null): string {
  if (tasa === null) return '';
  return tasa > 15 ? 'text-ok' : 'text-bad';
}

interface MetricasCardProps {
  titulo: string;
  movimientos: Movimiento[];
  subcategoriasPorId: SubcategoriasPorId;
  loading: boolean;
  // Tarjeta principal de la pantalla (con brillo neon). Solo en Inicio.
  destacada?: boolean;
}

// Grid de metricas reutilizable: recibe cualquier conjunto de movimientos (un mes, un rango de
// meses...) y calcula todo a partir de ahi, para poder mostrar el mismo bloque en Inicio
// (mes en curso) y en Visualizaciones (rango de meses elegido).
export function MetricasCard({ titulo, movimientos, subcategoriasPorId, loading, destacada = false }: MetricasCardProps) {
  // Todo sale del neteo por bolsa (ver lib/finance/bolsas.ts), igual que el resumen de categorias.
  const m = useMemo(() => calcularMetricas(movimientos, subcategoriasPorId), [movimientos, subcategoriasPorId]);
  const desgloseIngreso = useMemo(() => comoFilas(m.desgloseIngreso), [m]);
  const desgloseFijos = useMemo(() => comoFilas(m.desgloseFijos), [m]);
  const desgloseVariable = useMemo(() => comoFilas(m.desgloseVariables), [m]);
  const { ingresoReal, gastosFijos, gastosVariables, gastosTotales, ahorroNeto, inversionNeta, balanceNeto } = m;
  // pctGastado: solo para el anillo (gastos totales / ingreso real).
  const { tasaAhorro, tasaInversion, margenTrasFijos, pctGastado } = m;

  return (
    <Card glow={destacada}>
      <CardTitle icon={<IconMedidor />} className="mb-4">
        {titulo}
      </CardTitle>
      {loading ? (
        <Cargando />
      ) : (
        <>
          <div className="flex items-center gap-4 min-w-0">
            <ProgressRing pct={pctGastado} etiqueta="del ingreso gastado" size={120} />
            <div className="@container flex-1 min-w-0 flex flex-col divide-y divide-dashed divide-line [&>*]:py-2 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              <StatTile
                align="spread"
                size="lg"
                label="Ingreso real"
                value={`${formatearImporte(ingresoReal)} €`}
                colorClassName="text-ok"
                desglose={desgloseIngreso}
              />
              <StatTile
                align="spread"
                size="lg"
                label="Gastos totales"
                value={`${formatearImporte(gastosTotales)} €`}
                colorClassName="text-bad"
              />
              <StatTile
                align="spread"
                size="lg"
                label="Balance neto"
                value={`${formatearImporte(balanceNeto)} €`}
                colorClassName={claseColorPorSigno(balanceNeto)}
              />
            </div>
          </div>

          <hr className="divider my-4" />

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <StatTile
              label="Gastos fijos"
              value={`${formatearImporte(gastosFijos)} €`}
              colorClassName="text-bad"
              desglose={desgloseFijos}
            />
            <StatTile
              label="Gastos variables"
              value={`${formatearImporte(gastosVariables)} €`}
              colorClassName="text-bad"
              desglose={desgloseVariable}
            />
            <StatTile label="Ahorro neto" value={`${formatearImporte(ahorroNeto)} €`} colorClassName={claseColorPorSigno(ahorroNeto)} />
            <StatTile label="Inversión neta" value={`${formatearImporte(inversionNeta)} €`} colorClassName={claseColorPorSigno(inversionNeta)} />
            <StatTile
              label="Tasa de ahorro"
              value={tasaAhorro === null ? '—' : `${formatearImporte(tasaAhorro, 0)} %`}
              colorClassName={claseColorTasaAhorro(tasaAhorro)}
            />
            <StatTile
              label="Tasa de inversión"
              value={tasaInversion === null ? '—' : `${formatearImporte(tasaInversion, 0)} %`}
              colorClassName={claseColorTasaInversion(tasaInversion)}
            />
            <div className="col-span-2">
              <StatTile
                label="Margen tras fijos"
                value={margenTrasFijos === null ? '—' : `${formatearImporte(margenTrasFijos, 0)} %`}
                colorClassName={margenTrasFijos === null ? '' : claseColorPorSigno(margenTrasFijos)}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
