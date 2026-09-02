import type { Movimiento, Subcategoria } from '../../lib/supabase/database.types';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';

interface MovimientoRowProps {
  movimiento: Movimiento;
  subcategoria?: Subcategoria;
  onClick?: () => void;
}

export function MovimientoRow({ movimiento, subcategoria, onClick }: MovimientoRowProps) {
  const fecha = new Date(movimiento.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-2 px-1 text-left border-b border-[var(--color-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 rounded"
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--color-text)]">{movimiento.nombre}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {fecha} · {subcategoria?.nombre ?? '—'}
          {movimiento.visibilidad === 'compartido' ? ' · compartido' : ''}
        </p>
      </div>
      <span className={`shrink-0 font-mono text-sm font-semibold ${claseColorPorSigno(movimiento.importe)}`}>
        {movimiento.importe > 0 ? '+' : ''}
        {formatearImporte(movimiento.importe)} €
      </span>
    </button>
  );
}
