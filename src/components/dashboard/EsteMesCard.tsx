import { useState } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Segmented, type OpcionSegmentada } from '../ui/Segmented';
import { Cargando } from '../ui/Spinner';
import { IconCapas } from '../icons/UiIcons';
import { colorDeCategoria } from '../icons/coloresTaxonomia';
import { claseColorPorSigno } from '../charts/colors';
import { formatearImporte } from '../../lib/finance/formato';
import { IconoCategoria, IconoSubcategoria } from '../icons/IconoTaxonomia';
import type { BalanceSubcategoria } from '../../lib/finance/taxonomia';

type ModoVista = 'neto' | 'promedio_mensual' | 'porcentaje';

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
  // Numero de meses del rango mostrado (Visualizaciones: puede ser mas de 1). Con esto puesto
  // aparece un tercer modo "€/mes" (media mensual del rango). Sin el (Inicio, siempre 1 mes en
  // curso) el modo €/mes no aporta nada distinto de €, asi que no se ofrece.
  mesesEnRango?: number;
}

export function EsteMesCard({ titulo, balanceSubcategorias, loading, seleccion, mesesEnRango }: EsteMesCardProps) {
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
    if (modo === 'promedio_mensual') {
      const promedio = neto / (mesesEnRango && mesesEnRango > 0 ? mesesEnRango : 1);
      return `${promedio > 0 ? '+' : ''}${formatearImporte(promedio)} €/m`;
    }
    // Gasto -> % del total gastado ese mes; ingreso -> % del total ingresado ese mes.
    const base = neto < 0 ? totalGastado : totalIngresado;
    if (base <= 0) return '—';
    return `${formatearImporte((Math.abs(neto) / base) * 100, 0)}%`;
  }

  const modoSeleccion = seleccion?.activa ?? false;

  const opcionesModo: OpcionSegmentada<ModoVista>[] = [
    { value: 'neto', label: '€' },
    { value: 'porcentaje', label: '%' },
  ];
  if (mesesEnRango !== undefined) opcionesModo.push({ value: 'promedio_mensual', label: '€/m' });

  // Solo para la barra de cada categoria: peso de la categoria sobre el total de su signo (lo
  // mismo que muestra el modo %), para ver el reparto de un vistazo.
  function pesoCategoria(neto: number): number {
    const base = neto < 0 ? totalGastado : totalIngresado;
    return base > 0 ? (Math.abs(neto) / base) * 100 : 0;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-2">
        <CardTitle icon={<IconCapas />}>{titulo}</CardTitle>
        <Segmented size="sm" ariaLabel="Unidades" value={modo} onChange={setModo} options={opcionesModo} />
      </div>

      {loading ? (
        <Cargando />
      ) : balanceSubcategorias.length === 0 ? (
        <p className="empty">Sin movimientos en este periodo.</p>
      ) : (
        balanceSubcategorias.map((linea, indice) => {
          const nuevaCategoria = indice === 0 || balanceSubcategorias[indice - 1].categoriaId !== linea.categoriaId;
          const categoriaSeleccionada = modoSeleccion && seleccion!.estaSeleccionada(linea.categoriaId, null);
          const categoriaColor = modoSeleccion ? seleccion!.colorDe(linea.categoriaId, null) : undefined;
          const subSeleccionada = modoSeleccion && seleccion!.estaSeleccionada(linea.categoriaId, linea.subcategoriaId);
          const subColor = modoSeleccion ? seleccion!.colorDe(linea.categoriaId, linea.subcategoriaId) : undefined;
          const colorFijo = colorDeCategoria(linea.categoria);
          const netoCategoria = netoPorCategoriaId.get(linea.categoriaId) ?? 0;

          return (
            <div
              key={linea.subcategoriaId}
              className={nuevaCategoria ? 'pt-3 mt-2 border-t border-line first:pt-0 first:mt-0 first:border-t-0' : ''}
            >
              {nuevaCategoria && (
                <div className="mb-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {modoSeleccion ? (
                      <button
                        type="button"
                        onClick={() => seleccion!.onToggle(linea.categoriaId, null)}
                        aria-pressed={categoriaSeleccionada}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] min-w-0 ${
                          categoriaSeleccionada ? 'text-fg' : 'text-muted opacity-40'
                        }`}
                      >
                        {categoriaColor && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: categoriaColor, boxShadow: `0 0 6px ${categoriaColor}` }}
                            aria-hidden="true"
                          />
                        )}
                        <span style={{ color: colorFijo }} className="flex">
                          <IconoCategoria nombre={linea.categoria} />
                        </span>
                        <span className="truncate">{linea.categoria}</span>
                      </button>
                    ) : (
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-[0.12em] min-w-0">
                        <span style={{ color: colorFijo }} className="flex">
                          <IconoCategoria nombre={linea.categoria} />
                        </span>
                        <span className="truncate">{linea.categoria}</span>
                      </p>
                    )}
                    <p className="font-mono text-xs font-semibold text-fg shrink-0">{valorMostrado(netoCategoria)}</p>
                  </div>
                  <ProgressBar value={pesoCategoria(netoCategoria)} color={colorFijo} thin />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-line last:border-0">
                {modoSeleccion ? (
                  <button
                    type="button"
                    onClick={() => seleccion!.onToggle(linea.categoriaId, linea.subcategoriaId)}
                    aria-pressed={subSeleccionada}
                    className={`flex items-center gap-2 text-sm min-w-0 text-left ${
                      subSeleccionada ? 'text-fg' : 'text-muted opacity-40'
                    }`}
                  >
                    {subColor && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subColor, boxShadow: `0 0 6px ${subColor}` }}
                        aria-hidden="true"
                      />
                    )}
                    <IconoSubcategoria nombre={linea.subcategoria} className="w-4 h-4 shrink-0 text-muted" />
                    <span className="truncate">{linea.subcategoria}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-sm min-w-0">
                    <IconoSubcategoria nombre={linea.subcategoria} className="w-4 h-4 shrink-0 text-muted" />
                    <span className="truncate">{linea.subcategoria}</span>
                  </span>
                )}
                <span className={`font-mono text-sm font-semibold shrink-0 ${claseColorPorSigno(linea.neto)}`}>
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
