import { useState } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import { Cargando } from '../ui/Spinner';
import { IconCapas, IconChevronDown } from '../icons/UiIcons';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { rolSubcategoria, type ClaseGasto } from '../../lib/finance/bolsas';
import type { Subcategoria } from '../../lib/supabase/database.types';

// Selector Fijo/Variable de una bolsa; sin clasificar no marca ninguno.
export function SelectorClaseGasto({
  sub,
  onClasificar,
}: {
  sub: Subcategoria;
  onClasificar: (id: number, clase: ClaseGasto) => Promise<void>;
}) {
  const [error, setError] = useState(false);
  return (
    <Segmented
      size="sm"
      ariaLabel={`Tipo de gasto de ${sub.nombre}`}
      className={error ? '!border-bad' : ''}
      value={(sub.clase_gasto ?? '') as ClaseGasto}
      onChange={(clase) => {
        setError(false);
        onClasificar(sub.id, clase).catch(() => setError(true));
      }}
      options={[
        { value: 'fijo', label: 'Fijo' },
        { value: 'variable', label: 'Variable' },
      ]}
    />
  );
}

// Ajustes -> Gastos fijos y variables: la clasificacion de cada bolsa, por categoria.
export function ClaseGastoCard() {
  const { categorias, subcategorias, loading, clasificar } = useTaxonomia();
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const bolsas = subcategorias.filter((s) => rolSubcategoria(s) === 'gasto');

  function alternar(id: number) {
    setAbiertas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  return (
    <Card>
      <CardTitle icon={<IconCapas />} className="mb-1">
        Gastos fijos y variables
      </CardTitle>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Cómo cuenta cada subcategoría en las métricas. Salario, Paga Extra, Variable, Beneficios, Ingreso Extra, Ahorro e
        Inversiones van aparte.
      </p>
      {loading ? (
        <Cargando />
      ) : (
        <div className="flex flex-col">
          {categorias.map((c) => {
            const subs = bolsas.filter((s) => s.categoria_id === c.id);
            if (subs.length === 0) return null;
            const abierta = abiertas.has(c.id);
            const fijas = subs.filter((s) => s.clase_gasto === 'fijo').length;
            const sinClasificar = subs.filter((s) => !s.clase_gasto).length;
            return (
              <div key={c.id} className="border-t border-dashed border-line first:border-0">
                <button
                  type="button"
                  onClick={() => alternar(c.id)}
                  aria-expanded={abierta}
                  className="w-full flex items-center justify-between gap-2 py-2.5 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                    <IconChevronDown className={`w-3.5 h-3.5 text-cyan shrink-0 transition-transform ${abierta ? '' : '-rotate-90'}`} />
                    <span className="truncate">{c.nombre}</span>
                  </span>
                  <span className="font-mono text-[11.5px] text-muted shrink-0">
                    {sinClasificar > 0 && <span className="text-warn">{sinClasificar} sin clasificar · </span>}
                    {fijas} fijas · {subs.length - fijas - sinClasificar} variables
                  </span>
                </button>
                {abierta && (
                  <div className="flex flex-col pl-5 pb-2">
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className={`text-[13px] truncate min-w-0 ${s.clase_gasto ? '' : 'text-warn'}`}>{s.nombre}</span>
                        <SelectorClaseGasto sub={s} onClasificar={clasificar} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
