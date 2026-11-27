import { IconAlerta } from '../icons/UiIcons';
import { SelectorClaseGasto } from '../ajustes/ClaseGastoCard';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { bolsasSinClasificar } from '../../lib/finance/bolsas';

// Aviso global cuando hay subcategorias de gasto sin clasificar como fijas o variables (p.ej.
// una nueva): se clasifican aqui mismo y el aviso desaparece. Mientras tanto cuentan como
// variables en las metricas.
export function AvisoClasificacion() {
  const { categorias, subcategorias, loading, clasificar } = useTaxonomia();
  const pendientes = bolsasSinClasificar(subcategorias);
  if (loading || pendientes.length === 0) return null;
  const categoria = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? '—';

  return (
    <div
      className="card mb-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--warn) 45%, var(--line))',
        background: 'color-mix(in srgb, var(--warn) 8%, var(--card))',
      }}
      role="status"
    >
      <p className="flex items-center gap-2.5 text-sm font-medium mb-1">
        <IconAlerta className="w-[18px] h-[18px] text-warn shrink-0" />
        {pendientes.length === 1 ? 'Clasifica esta subcategoría nueva' : `Clasifica ${pendientes.length} subcategorías nuevas`}
      </p>
      <p className="text-xs text-muted mb-2">¿Es un gasto fijo o variable? Mientras tanto cuenta como variable.</p>
      {pendientes.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-dashed border-line">
          <span className="min-w-0 text-[13px] truncate">
            {s.nombre} <span className="text-muted">· {categoria(s.categoria_id)}</span>
          </span>
          <SelectorClaseGasto sub={s} onClasificar={clasificar} />
        </div>
      ))}
    </div>
  );
}
