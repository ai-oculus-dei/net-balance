import { useState } from 'react';
import { Card } from '../ui/Card';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import type { BalanceSubcategoria } from '../../lib/finance/taxonomia';

type ModoVista = 'neto' | 'porcentaje';

export interface SeleccionCategorias {
  activa: boolean;
  estaSeleccionada: (categoriaId: number, subcategoriaId: number | null) => boolean;
  colorDe: (categoriaId: number, subcategoriaId: number | null) => string | undefined;
  onToggle: (categoriaId: number, subcategoriaId: number | null) => void;
}

interface EsteMesCardProps {
  titulo: string;
  balanceSubcategorias: BalanceSubcategoria[];
  loading: boolean;
  // Cuando se pasa y `activa` es true, los nombres de categoria/subcategoria se pueden pulsar
  // para (des)seleccionarlos para Visualizaciones: seleccionado = brillo normal + punto de
  // color, sin seleccionar = atenuado. Sin esta prop (o con `activa: false`) la tarjeta es de
  // solo lectura, exactamente igual que en Inicio.
  seleccion?: SeleccionCategorias;
}

export function EsteMesCard({ titulo, balanceSubcategorias, loading, seleccion }: EsteMesCardProps) {
  const [modo, setModo] = useState<ModoVista>('neto');

  const totalGastado = balanceSubcategorias
    .filter((l) => l.neto < 0)
    .reduce((suma, l) => suma + Math.abs(l.neto), 0);
  const totalIngresado = balanceSubcategorias.filter((l) => l.neto > 0).reduce((suma, l) => suma + l.neto, 0);

  const netoPorCategoriaId = new Map<number, number>();
  for (const l of balanceSubcategorias) {
    netoPorCategoriaId.set(l.categoriaId, (netoPorCategoriaId.get(l.categoriaId) ?? 0) + l.neto);
  }

  function valorMostrado(neto: number): string {
    if (modo === 'neto') {
      return `${neto > 0 ? '+' : ''}${formatearImporte(neto)} €`;
    }
    // Gasto -> % del total gastado ese mes; ingreso -> % del total ingresado ese mes.
    const base = neto < 0 ? totalGastado : totalIngresado;
    if (base <= 0) return '—';
    return `${formatearImporte((Math.abs(neto) / base) * 100, 0)}%`;
  }

  const modoSeleccion = seleccion?.activa ?? false;

  return (
    <Card>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide truncate">
          {titulo}
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
        <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos en este periodo.</p>
      ) : (
        balanceSubcategorias.map((linea, indice) => {
          const nuevaCategoria = indice === 0 || balanceSubcategorias[indice - 1].categoriaId !== linea.categoriaId;
          const categoriaSeleccionada = modoSeleccion && seleccion!.estaSeleccionada(linea.categoriaId, null);
          const categoriaColor = modoSeleccion ? seleccion!.colorDe(linea.categoriaId, null) : undefined;
          const subSeleccionada = modoSeleccion && seleccion!.estaSeleccionada(linea.categoriaId, linea.subcategoriaId);
          const subColor = modoSeleccion ? seleccion!.colorDe(linea.categoriaId, linea.subcategoriaId) : undefined;

          return (
            <div
              key={linea.subcategoriaId}
              className={nuevaCategoria ? 'pt-3 mt-3 border-t-2 border-[var(--color-border)] first:pt-0 first:mt-0 first:border-t-0' : ''}
            >
              {nuevaCategoria && (
                <div className="flex items-center justify-between mb-1">
                  {modoSeleccion ? (
                    <button
                      type="button"
                      onClick={() => seleccion!.onToggle(linea.categoriaId, null)}
                      className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                        categoriaSeleccionada ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'
                      }`}
                    >
                      {categoriaColor && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoriaColor }} aria-hidden="true" />
                      )}
                      {linea.categoria}
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                      {linea.categoria}
                    </p>
                  )}
                  <p className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                    {valorMostrado(netoPorCategoriaId.get(linea.categoriaId) ?? 0)}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                {modoSeleccion ? (
                  <button
                    type="button"
                    onClick={() => seleccion!.onToggle(linea.categoriaId, linea.subcategoriaId)}
                    className={`flex items-center gap-1.5 text-sm ${
                      subSeleccionada ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'
                    }`}
                  >
                    {subColor && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subColor }} aria-hidden="true" />
                    )}
                    {linea.subcategoria}
                  </button>
                ) : (
                  <span className="text-sm">{linea.subcategoria}</span>
                )}
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
