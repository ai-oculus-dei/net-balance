import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { claseColorPorSigno } from '../charts/colors';
import {
  ahorroTotalDelMes,
  balanceNetoDelMes,
  gastoRealTotalDelMes,
  gastoVariableDelMes,
  inversionTotalDelMes,
  margenOperativoDelMes,
  tasaAhorroDelMes,
  tasaInversionDelMes,
} from '../../lib/finance/metricas';
import { gastosFijosDelMes, ingresoRealDelMes, type SubcategoriasPorId } from '../../lib/finance/taxonomia';
import type { Movimiento } from '../../lib/supabase/database.types';

// Tasa de ahorro: verde si se ahorra "bien" (>30%), roja si es baja (<20%), blanca en medio.
function claseColorTasaAhorro(tasa: number | null): string {
  if (tasa === null) return '';
  if (tasa > 30) return 'text-[var(--color-gain)]';
  if (tasa < 20) return 'text-[var(--color-loss)]';
  return '';
}

// Tasa de inversion: verde por encima del 15%, roja por debajo (sin zona neutra).
function claseColorTasaInversion(tasa: number | null): string {
  if (tasa === null) return '';
  return tasa > 15 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]';
}

interface MetricasCardProps {
  titulo: string;
  movimientos: Movimiento[];
  subcategoriasPorId: SubcategoriasPorId;
  loading: boolean;
}

// Grid de metricas reutilizable: recibe cualquier conjunto de movimientos (un mes, un rango de
// meses...) y calcula todo a partir de ahi, para poder mostrar el mismo bloque en Inicio
// (mes en curso) y en Visualizaciones (rango de meses elegido).
export function MetricasCard({ titulo, movimientos, subcategoriasPorId, loading }: MetricasCardProps) {
  const ingresoReal = useMemo(
    () => ingresoRealDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const gastosFijos = useMemo(
    () => gastosFijosDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const gastoRealTotal = useMemo(
    () => gastoRealTotalDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const gastoVariable = useMemo(() => gastoVariableDelMes(gastoRealTotal, gastosFijos), [gastoRealTotal, gastosFijos]);
  const balanceNeto = useMemo(() => balanceNetoDelMes(movimientos), [movimientos]);
  const ahorroTotal = useMemo(
    () => ahorroTotalDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const inversionTotal = useMemo(
    () => inversionTotalDelMes(movimientos, subcategoriasPorId),
    [movimientos, subcategoriasPorId]
  );
  const tasaAhorro = useMemo(() => tasaAhorroDelMes(ahorroTotal, ingresoReal), [ahorroTotal, ingresoReal]);
  const tasaInversion = useMemo(() => tasaInversionDelMes(inversionTotal, ingresoReal), [inversionTotal, ingresoReal]);
  const margenOperativo = useMemo(() => margenOperativoDelMes(ingresoReal, gastosFijos), [ingresoReal, gastosFijos]);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">{titulo}</h2>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Ingreso real" value={`${ingresoReal.toFixed(2)} €`} colorClassName="text-[var(--color-gain)]" />
          <StatTile label="Gastos totales" value={`${gastoRealTotal.toFixed(2)} €`} colorClassName="text-[var(--color-loss)]" />
          <StatTile label="Gastos fijos" value={`${gastosFijos.toFixed(2)} €`} colorClassName="text-[var(--color-loss)]" />
          <StatTile label="Gastos variables" value={`${gastoVariable.toFixed(2)} €`} colorClassName={claseColorPorSigno(-gastoVariable)} />
          <StatTile label="Balance neto" value={`${balanceNeto.toFixed(2)} €`} colorClassName={claseColorPorSigno(balanceNeto)} />
          <StatTile
            label="Operating margin"
            value={margenOperativo === null ? '—' : `${margenOperativo.toFixed(0)} %`}
            colorClassName={margenOperativo === null ? '' : claseColorPorSigno(margenOperativo)}
          />
          <StatTile label="Ahorro total" value={`${ahorroTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(ahorroTotal)} />
          <StatTile label="Inversión total" value={`${inversionTotal.toFixed(2)} €`} colorClassName={claseColorPorSigno(inversionTotal)} />
          <StatTile
            label="Tasa de ahorro"
            value={tasaAhorro === null ? '—' : `${tasaAhorro.toFixed(0)} %`}
            colorClassName={claseColorTasaAhorro(tasaAhorro)}
          />
          <StatTile
            label="Tasa de inversión"
            value={tasaInversion === null ? '—' : `${tasaInversion.toFixed(0)} %`}
            colorClassName={claseColorTasaInversion(tasaInversion)}
          />
        </div>
      )}
    </Card>
  );
}
