import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { ObjetivoAhorro } from '../../lib/supabase/database.types';

interface ObjetivoCardProps {
  objetivo: ObjetivoAhorro;
  onClick: () => void;
}

export function ObjetivoCard({ objetivo, onClick }: ObjetivoCardProps) {
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
            {objetivo.acumulado.toFixed(2)} € / {(objetivo.meta ?? 0).toFixed(2)} €
            {objetivo.modo_aportacion === 'automatico' ? ' · automático' : ` · manual (${objetivo.porcentaje}%)`}
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">{objetivo.porcentaje}% del ingreso real / mes</p>
      )}
    </Card>
  );
}
