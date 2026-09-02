import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { formatearImporte } from '../../lib/finance/formato';
import type { ObjetivoAhorro } from '../../lib/supabase/database.types';

interface ObjetivoCardProps {
  objetivo: ObjetivoAhorro;
  aportacionMensual: number;
  onClick: () => void;
}

export function ObjetivoCard({ objetivo, aportacionMensual, onClick }: ObjetivoCardProps) {
  const esAcumulativo = objetivo.tipo === 'acumulativo';
  const progreso = esAcumulativo && objetivo.meta ? (objetivo.acumulado / objetivo.meta) * 100 : 0;

  return (
    <Card className="cursor-pointer hover:opacity-90" onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{objetivo.nombre}</h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {esAcumulativo ? 'Acumulativo' : 'Recurrente'}
        </span>
      </div>

      {esAcumulativo ? (
        <>
          <ProgressBar value={progreso} />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {formatearImporte(objetivo.acumulado)} € / {formatearImporte(objetivo.meta ?? 0)} €
            {objetivo.modo_aportacion === 'automatico' ? ' · automático' : ` · manual (${objetivo.porcentaje}%)`}
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">{objetivo.porcentaje}% del ingreso real / mes</p>
      )}

      {objetivo.activo ? (
        <p className="mt-2 pt-2 border-t border-[var(--color-border)] text-sm">
          <span className="text-[var(--color-text-muted)]">Ahorrar este mes: </span>
          <span className="font-semibold text-[var(--color-accent)]">{formatearImporte(aportacionMensual)} €</span>
        </p>
      ) : (
        <p className="mt-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          Inactivo — no aporta este mes
        </p>
      )}
    </Card>
  );
}
