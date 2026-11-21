import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconAlerta, IconChevronDown } from '../icons/UiIcons';
import { useObjetivosCartera } from '../../hooks/useObjetivosCartera';
import { formatearImporte } from '../../lib/finance/formato';
import { desviacionesCartera, unidadesCartera, type DesviacionCartera } from '../../lib/finance/objetivosCartera';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface AvisoCarteraProps {
  posicionesActivas: PosicionPatrimonio[];
  loading: boolean;
}

const pct = (v: number) => `${formatearImporte(v, 1)} %`;

// Aviso global (arriba en todas las pantallas) cuando algun activo o bloque se sale del margen
// de su objetivo de cartera — ver lib/finance/objetivosCartera.ts. No aparece si todo esta en
// rango, si no hay objetivos o si la tabla todavia no existe.
export function AvisoCartera({ posicionesActivas, loading }: AvisoCarteraProps) {
  const { objetivos, loading: loadingObjetivos, error } = useObjetivosCartera();
  const desviaciones = useMemo(
    () => desviacionesCartera(unidadesCartera(posicionesActivas), objetivos),
    [posicionesActivas, objetivos]
  );

  if (loading || loadingObjetivos || error) return null;
  return <AvisoCarteraVista desviaciones={desviaciones} />;
}

// Parte visual, separada de la carga de datos.
export function AvisoCarteraVista({ desviaciones }: { desviaciones: DesviacionCartera[] }) {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  if (desviaciones.length === 0) return null;
  const n = desviaciones.length;

  return (
    <div
      className="card !p-0 mb-4 overflow-hidden"
      style={{
        borderColor: 'color-mix(in srgb, var(--warn) 45%, var(--line))',
        background: 'color-mix(in srgb, var(--warn) 8%, var(--card))',
        boxShadow: '0 0 0 1px color-mix(in srgb, var(--warn) 12%, transparent), 0 8px 28px -16px var(--warn)',
      }}
      role="status"
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left cursor-pointer"
      >
        <IconAlerta className="w-[18px] h-[18px] text-warn shrink-0" style={{ filter: 'drop-shadow(0 0 5px var(--warn))' }} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">
            {n === 1 ? '1 activo fuera de su objetivo' : `${n} activos fuera de su objetivo`}
          </span>
          {!abierto && (
            <span className="block font-mono text-[11px] text-muted truncate">
              {desviaciones[0].nombre} {pct(desviaciones[0].pct)} · obj {pct(desviaciones[0].objetivoPct)}
              {n > 1 ? ` · +${n - 1} más` : ''}
            </span>
          )}
        </span>
        <IconChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-4 pb-3">
          {desviaciones.map((d) => (
            <div key={d.clave} className="flex items-center justify-between gap-3 py-2 border-t border-dashed border-line text-sm">
              <span className="min-w-0">
                <span className="block truncate">{d.nombre}</span>
                <span className="block font-mono text-[11px] text-muted">
                  obj {pct(d.objetivoPct)} · rango {pct(Math.max(0, d.objetivoPct - d.margen))}–{pct(Math.min(100, d.objetivoPct + d.margen))}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="block font-mono font-semibold text-warn">{pct(d.pct)}</span>
                <span className="block text-[11px] text-muted">{d.estado === 'por_encima' ? 'por encima' : 'por debajo'}</span>
              </span>
            </div>
          ))}
          {!pathname.startsWith('/patrimonio') && (
            <Link to="/patrimonio" className="btn btn-ghost btn-sm w-full mt-2 !text-fg">
              Ver en Patrimonio
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
