import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconAlerta, IconChevronDown } from '../icons/UiIcons';
import { useMesActual } from '../../hooks/useMesActual';
import { usePresupuestoGasto } from '../../hooks/usePresupuestoGasto';
import { useAuth } from '../../lib/auth/useAuth';
import { formatearImporte } from '../../lib/finance/formato';
import { estadoPresupuesto, lineasAlLimite, type EstadoLineaPresupuesto } from '../../lib/finance/presupuestoGasto';

const eur = (v: number) => `${formatearImporte(v, 0)} €`;

// Aviso global (debajo del de cartera) cuando a algun objetivo de gasto del mes en curso le
// queda menos de un 10 % o ya se ha pasado — ver lib/finance/presupuestoGasto.ts.
export function AvisoGastos() {
  const { session } = useAuth();
  const { movimientos, loading: loadingMes } = useMesActual();
  const { lineas, loading, error } = usePresupuestoGasto();
  const alLimite = useMemo(
    () => lineasAlLimite(estadoPresupuesto(lineas, movimientos, session?.user.id)),
    [lineas, movimientos, session?.user.id]
  );

  if (loading || loadingMes || error) return null;
  return <AvisoGastosVista alLimite={alLimite} />;
}

function AvisoGastosVista({ alLimite }: { alLimite: EstadoLineaPresupuesto[] }) {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  if (alLimite.length === 0) return null;
  const n = alLimite.length;
  const pasados = alLimite.filter((e) => e.restante < 0).length;
  const color = pasados > 0 ? 'var(--bad)' : 'var(--warn)';
  const primero = alLimite[0];

  return (
    <div
      className="card !p-0 mb-4 overflow-hidden"
      style={{
        borderColor: `color-mix(in srgb, ${color} 45%, var(--line))`,
        background: `color-mix(in srgb, ${color} 8%, var(--card))`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 12%, transparent), 0 8px 28px -16px ${color}`,
      }}
      role="status"
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left cursor-pointer"
      >
        <IconAlerta className="w-[18px] h-[18px] shrink-0" style={{ color, filter: `drop-shadow(0 0 5px ${color})` }} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">
            {n === 1 ? '1 objetivo de gasto al límite' : `${n} objetivos de gasto al límite`}
            {pasados > 0 && <span className="text-bad"> · {pasados} superado{pasados === 1 ? '' : 's'}</span>}
          </span>
          {!abierto && (
            <span className="block font-mono text-[11px] text-muted truncate">
              {primero.linea.nombre} {eur(primero.gastado)} / {eur(primero.linea.importe)}
              {n > 1 ? ` · +${n - 1} más` : ''}
            </span>
          )}
        </span>
        <IconChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-4 pb-3">
          {alLimite.map((e) => {
            const pasado = e.restante < 0;
            return (
              <div key={e.linea.id} className="flex items-center justify-between gap-3 py-2 border-t border-dashed border-line text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{e.linea.nombre}</span>
                  <span className="block font-mono text-[11px] text-muted truncate">
                    {e.linea.grupo} · {eur(e.gastado)} de {eur(e.linea.importe)}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className={`block font-mono font-semibold ${pasado ? 'text-bad' : 'text-warn'}`}>
                    {formatearImporte(e.pct, 0)} %
                  </span>
                  <span className="block text-[11px] text-muted">
                    {pasado ? `+${eur(-e.restante)} de más` : `quedan ${eur(e.restante)}`}
                  </span>
                </span>
              </div>
            );
          })}
          {!pathname.startsWith('/ajustes') && (
            <Link to="/ajustes" className="btn btn-ghost btn-sm w-full mt-2 !text-fg">
              Ver objetivos de gasto
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
