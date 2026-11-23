import { useMemo, useState, type FormEvent } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Cargando } from '../ui/Spinner';
import { FormActions, FormError } from '../ui/FormActions';
import { IconChevronDown, IconMedidor, IconPapelera, IconPlus } from '../icons/UiIcons';
import { usePresupuestoGasto } from '../../hooks/usePresupuestoGasto';
import { useMesActual } from '../../hooks/useMesActual';
import { useAuth } from '../../lib/auth/useAuth';
import { formatearImporte } from '../../lib/finance/formato';
import { parsearEuros } from '../../lib/finance/objetivosCartera';
import {
  UMBRAL_AVISO_GASTO,
  agruparPresupuesto,
  estadoPresupuesto,
  type LineaPresupuesto,
} from '../../lib/finance/presupuestoGasto';
import type { Categoria, Subcategoria } from '../../lib/supabase/database.types';

const eur = (v: number) => `${formatearImporte(v, 0)} €`;

function colorProgreso(pct: number): string {
  if (pct > 100) return 'var(--bad)';
  if (pct >= UMBRAL_AVISO_GASTO) return 'var(--warn)';
  return 'var(--cyan)';
}

// Ajustes -> Objetivos de gasto: un importe al mes por linea, agrupadas (Vivienda, Coche...),
// con lo gastado en el mes en curso. Tocar una linea la edita.
export function PresupuestoGastoCard() {
  const { session } = useAuth();
  const { lineas, esPorDefecto, categorias, subcategorias, loading, error, guardar, restablecer } = usePresupuestoGasto();
  const { movimientos, loading: loadingMes } = useMesActual();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  // null = cerrado; 'nueva' = alta; si no, la linea que se edita.
  const [editando, setEditando] = useState<LineaPresupuesto | 'nueva' | null>(null);

  const grupos = useMemo(
    () => agruparPresupuesto(estadoPresupuesto(lineas, movimientos, session?.user.id)),
    [lineas, movimientos, session?.user.id]
  );
  const total = grupos.reduce((s, g) => s + g.importe, 0);
  const gastadoTotal = grupos.reduce((s, g) => s + g.gastado, 0);

  function alternar(grupo: string) {
    setAbiertos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(grupo)) nuevo.delete(grupo);
      else nuevo.add(grupo);
      return nuevo;
    });
  }

  async function guardarLinea(linea: LineaPresupuesto) {
    const existe = lineas.some((l) => l.id === linea.id);
    await guardar(existe ? lineas.map((l) => (l.id === linea.id ? linea : l)) : [...lineas, linea]);
    setEditando(null);
  }

  async function borrarLinea(id: string) {
    await guardar(lineas.filter((l) => l.id !== id));
    setEditando(null);
  }

  async function handleRestablecer() {
    if (!window.confirm('¿Volver a los objetivos de gasto por defecto? Se perderán tus cambios.')) return;
    await restablecer();
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3 mb-1">
          <CardTitle icon={<IconMedidor />}>Objetivos de gasto</CardTitle>
          {!loading && <span className="font-mono text-sm font-semibold shrink-0">{eur(total)}/mes</span>}
        </div>
        <p className="text-xs text-muted leading-relaxed mb-3">
          Gastado este mes (solo tus movimientos): <span className="font-mono text-fg">{eur(gastadoTotal)}</span>. Avisa
          arriba cuando a una línea le queda menos de un 10 %.
        </p>

        {loading || loadingMes ? (
          <Cargando />
        ) : error ? (
          <p className="text-sm text-muted">No se han podido cargar los objetivos: {error}</p>
        ) : (
          <div className="flex flex-col">
            {grupos.map((g) => {
              const abierto = abiertos.has(g.grupo);
              const pctGrupo = g.importe > 0 ? (g.gastado / g.importe) * 100 : 0;
              return (
                <div key={g.grupo} className="border-t border-dashed border-line first:border-0">
                  <button
                    type="button"
                    onClick={() => alternar(g.grupo)}
                    aria-expanded={abierto}
                    className="w-full flex flex-col gap-1.5 py-2.5 text-left cursor-pointer"
                  >
                    <span className="w-full flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                        <IconChevronDown
                          className={`w-3.5 h-3.5 text-cyan shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`}
                        />
                        <span className="truncate">{g.grupo}</span>
                      </span>
                      <span className="font-mono text-xs shrink-0">
                        {eur(g.gastado)} <span className="text-muted">/ {eur(g.importe)}</span>
                      </span>
                    </span>
                    <ProgressBar value={pctGrupo} color={colorProgreso(pctGrupo)} thin />
                  </button>

                  {abierto && (
                    <div className="flex flex-col pl-5 pb-2">
                      {g.estados.map((e) => (
                        <button
                          key={e.linea.id}
                          type="button"
                          onClick={() => setEditando(e.linea)}
                          className="w-full flex flex-col gap-1 py-2 text-left rounded-[8px] hover-tint cursor-pointer"
                        >
                          <span className="w-full flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate min-w-0">
                              {e.linea.nombre}
                              {e.linea.subcategoriaIds.length === 0 && <span className="text-warn"> · sin subcategoría</span>}
                            </span>
                            <span className="font-mono text-[11.5px] shrink-0">
                              {eur(e.gastado)} <span className="text-muted">/ {eur(e.linea.importe)}</span>
                            </span>
                          </span>
                          <ProgressBar value={e.pct} color={colorProgreso(e.pct)} thin />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 mt-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditando('nueva')}>
                <IconPlus />
                Añadir línea
              </Button>
              {!esPorDefecto && (
                <Button type="button" variant="ghost" onClick={handleRestablecer}>
                  Restablecer
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando === 'nueva' ? 'Nueva línea de gasto' : 'Objetivo de gasto'}
      >
        {editando !== null && (
          <LineaPresupuestoForm
            inicial={editando === 'nueva' ? null : editando}
            grupos={grupos.map((g) => g.grupo)}
            categorias={categorias}
            subcategorias={subcategorias}
            onCancel={() => setEditando(null)}
            onSubmit={guardarLinea}
            onBorrar={editando === 'nueva' ? undefined : () => borrarLinea(editando.id)}
          />
        )}
      </Modal>
    </>
  );
}

function LineaPresupuestoForm({
  inicial,
  grupos,
  categorias,
  subcategorias,
  onSubmit,
  onCancel,
  onBorrar,
}: {
  inicial: LineaPresupuesto | null;
  grupos: string[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  onSubmit: (linea: LineaPresupuesto) => Promise<void>;
  onCancel: () => void;
  onBorrar?: () => Promise<void>;
}) {
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  // Sin separador de miles: es lo que se va a seguir editando a mano.
  const [importe, setImporte] = useState(inicial ? String(inicial.importe).replace('.', ',') : '');
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set(inicial?.subcategoriaIds ?? []));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternarSub(id: number) {
    setSeleccion((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function ejecutar(accion: () => Promise<void>) {
    setGuardando(true);
    setError(null);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar.');
    } finally {
      setGuardando(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const valor = parsearEuros(importe);
    if (!grupo.trim() || !nombre.trim()) {
      setError('Pon un grupo y un nombre.');
      return;
    }
    if (valor === null || Number.isNaN(valor)) {
      setError('Escribe el objetivo en euros al mes.');
      return;
    }
    void ejecutar(() =>
      onSubmit({
        id: inicial?.id ?? crypto.randomUUID(),
        grupo: grupo.trim(),
        nombre: nombre.trim(),
        importe: valor,
        subcategoriaIds: [...seleccion].sort((a, b) => a - b),
      })
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Grupo" list="grupos-presupuesto" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
        <Input
          label="€ / mes"
          inputMode="decimal"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          className="font-mono"
        />
      </div>
      <datalist id="grupos-presupuesto">
        {grupos.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <div>
        <p className="text-xs text-muted mb-2">Subcategorías que cuentan ({seleccion.size})</p>
        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
          {categorias.map((c) => {
            const subs = subcategorias.filter((s) => s.categoria_id === c.id);
            if (subs.length === 0) return null;
            return (
              <div key={c.id}>
                <p className="kpi-label mb-1.5">{c.nombre}</p>
                <div className="flex flex-wrap gap-1.5">
                  {subs.map((s) => {
                    const activa = seleccion.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => alternarSub(s.id)}
                        aria-pressed={activa}
                        className={`tag !text-[12px] !px-2.5 !py-1 cursor-pointer ${
                          activa ? '!text-cyan !border-[var(--cyan)] bg-[color-mix(in_srgb,var(--cyan)_12%,transparent)]' : ''
                        }`}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormError>{error}</FormError>
      <FormActions onCancel={onCancel} guardando={guardando} />
      {onBorrar && (
        <Button type="button" variant="danger" disabled={guardando} onClick={() => void ejecutar(onBorrar)}>
          <IconPapelera />
          Borrar línea
        </Button>
      )}
    </form>
  );
}
