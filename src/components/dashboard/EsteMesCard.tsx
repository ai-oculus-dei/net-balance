import { useState } from 'react';
import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import type { BalanceSubcategoria } from '../../lib/finance/taxonomia';

type ModoVista = 'neto' | 'porcentaje';

interface EsteMesCardProps {
  etiquetaMes: string;
  balanceSubcategorias: BalanceSubcategoria[];
  loading: boolean;
}

export function EsteMesCard({ etiquetaMes, balanceSubcategorias, loading }: EsteMesCardProps) {
  const [modo, setModo] = useState<ModoVista>('neto');

  const totalGastado = balanceSubcategorias
    .filter((l) => l.neto < 0)
    .reduce((suma, l) => suma + Math.abs(l.neto), 0);
  const totalIngresado = balanceSubcategorias.filter((l) => l.neto > 0).reduce((suma, l) => suma + l.neto, 0);

  function valorMostrado(neto: number): string {
    if (modo === 'neto') {
      return `${neto > 0 ? '+' : ''}${neto.toFixed(2)} €`;
    }
    // Gasto -> % del total gastado ese mes; ingreso -> % del total ingresado ese mes.
    const base = neto < 0 ? totalGastado : totalIngresado;
    if (base <= 0) return '—';
    return `${((Math.abs(neto) / base) * 100).toFixed(0)}%`;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide truncate">
          Este mes: {etiquetaMes}
        </h2>
        <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo('neto')}
            aria-pressed={modo === 'neto'}
            className={`px-2.5 py-1 ${modo === 'neto' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            €
          </button>
          <button
            type="button"
            onClick={() => setModo('porcentaje')}
            aria-pressed={modo === 'porcentaje'}
            className={`px-2.5 py-1 ${modo === 'porcentaje' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            %
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : balanceSubcategorias.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos este mes.</p>
      ) : (
        balanceSubcategorias.map((linea, indice) => {
          const nuevaCategoria = indice === 0 || balanceSubcategorias[indice - 1].categoriaId !== linea.categoriaId;
          return (
            <div
              key={linea.subcategoriaId}
              className={nuevaCategoria ? 'pt-3 mt-3 border-t-2 border-[var(--color-border)] first:pt-0 first:mt-0 first:border-t-0' : ''}
            >
              {nuevaCategoria && (
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                  {linea.categoria}
                </p>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                <span className="text-sm">{linea.subcategoria}</span>
                <span className={`font-mono text-sm font-semibold ${claseColorPorSigno(linea.neto)}`}>
                  {valorMostrado(linea.neto)}
                </span>
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}
