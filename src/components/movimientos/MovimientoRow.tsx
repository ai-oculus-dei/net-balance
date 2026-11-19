import type { Movimiento, Subcategoria } from '../../lib/supabase/database.types';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { IconoSubcategoria } from '../icons/IconoTaxonomia';
import { colorDeSubcategoria } from '../icons/coloresTaxonomia';

interface MovimientoRowProps {
  movimiento: Movimiento;
  subcategoria?: Subcategoria;
  onClick?: () => void;
}

export function MovimientoRow({ movimiento, subcategoria, onClick }: MovimientoRowProps) {
  const fecha = new Date(movimiento.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const color = colorDeSubcategoria(subcategoria?.nombre);

  return (
    <button onClick={onClick} className="row-item w-full text-left cursor-pointer">
      <span
        className="thumb"
        style={{
          color,
          borderColor: `color-mix(in srgb, ${color} 30%, var(--line))`,
          background: `color-mix(in srgb, ${color} 9%, var(--bg-2))`,
        }}
      >
        {subcategoria && <IconoSubcategoria nombre={subcategoria.nombre} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] text-fg">{movimiento.nombre}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted min-w-0 mt-0.5">
          <span className="font-mono shrink-0">{fecha}</span>
          <span className="text-faint">·</span>
          <span className="truncate">{subcategoria?.nombre ?? '—'}</span>
          {movimiento.visibilidad === 'compartido' && <span className="tag shrink-0">compartido</span>}
        </span>
      </span>
      <span className={`shrink-0 font-mono text-sm font-semibold text-right ${claseColorPorSigno(movimiento.importe)}`}>
        {movimiento.importe > 0 ? '+' : ''}
        {formatearImporte(movimiento.importe)} €
      </span>
    </button>
  );
}
