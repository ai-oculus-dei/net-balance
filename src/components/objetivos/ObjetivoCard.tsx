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
    <Card onClick={onClick} className={objetivo.activo ? '' : 'opacity-70'}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-[15px] truncate min-w-0">{objetivo.nombre}</h3>
        <span className="tag shrink-0">{esAcumulativo ? 'acumulativo' : 'recurrente'}</span>
      </div>

      {esAcumulativo ? (
        <>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="font-mono text-[13px] text-fg truncate min-w-0">
              {formatearImporte(objetivo.acumulado)} €<span className="text-faint"> / {formatearImporte(objetivo.meta ?? 0)} €</span>
            </span>
            <span className="font-mono text-xs font-semibold text-cyan shrink-0">{formatearImporte(progreso, 0)}%</span>
          </div>
          <ProgressBar value={progreso} color={progreso > 100 ? 'var(--ok)' : 'var(--cyan)'} />
          <p className="text-xs text-muted mt-2">
            {objetivo.modo_aportacion === 'automatico' ? 'Aportación automática' : `Aportación manual · ${objetivo.porcentaje}%`}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted">
          <span className="font-mono text-fg">{objetivo.porcentaje}%</span> del ingreso real / mes
        </p>
      )}

      {objetivo.activo ? (
        <p className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-line">
          <span className="kpi-label">Ahorrar este mes</span>
          <span className="font-mono text-[15px] font-semibold text-cyan">{formatearImporte(aportacionMensual)} €</span>
        </p>
      ) : (
        <p className="mt-3 pt-3 border-t border-dashed border-line text-xs text-muted">Inactivo — no aporta este mes</p>
      )}
    </Card>
  );
}
