import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { MovimientoForm, type MovimientoFormValues } from '../components/movimientos/MovimientoForm';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { formatearMes, parseMes, rangoDelMes } from '../lib/finance/fechas';
import { indexarSubcategorias } from '../lib/finance/taxonomia';
import { fetchAportacionPorMovimiento, sincronizarAportacion } from '../lib/supabase/queries/aportaciones';
import { emitObjetivosChanged } from '../lib/events/objetivosBus';
import type { AportacionObjetivo, Movimiento } from '../lib/supabase/database.types';

export function MovimientosPage() {
  const [mes, setMes] = useState(() => formatearMes(new Date()));
  const fechaBase = useMemo(() => parseMes(mes), [mes]);
  const rango = useMemo(() => rangoDelMes(fechaBase), [fechaBase]);

  function cambiarMes(delta: number) {
    setMes(formatearMes(new Date(fechaBase.getFullYear(), fechaBase.getMonth() + delta, 1)));
  }

  const { movimientos, loading, actualizar, borrar } = useMovimientos(rango);
  const { subcategorias } = useTaxonomia();
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const [editando, setEditando] = useState<Movimiento | null>(null);
  const [aportacionEditando, setAportacionEditando] = useState<AportacionObjetivo | null>(null);

  useEffect(() => {
    if (!editando) {
      setAportacionEditando(null);
      return;
    }
    let cancelado = false;
    fetchAportacionPorMovimiento(editando.id).then((a) => {
      if (!cancelado) setAportacionEditando(a);
    });
    return () => {
      cancelado = true;
    };
  }, [editando]);

  async function handleUpdate(values: MovimientoFormValues) {
    if (!editando) return;
    await actualizar(editando.id, {
      nombre: values.nombre,
      fecha: values.fecha,
      importe: values.importe,
      subcategoria_id: values.subcategoria_id,
      usuario_id: values.usuario_id,
      visibilidad: values.visibilidad,
      nota: values.nota || null,
    });
    await sincronizarAportacion(editando.id, aportacionEditando, values.aportacion);
    emitObjetivosChanged();
    setEditando(null);
  }

  const etiquetaMes = fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md border border-[var(--color-border)] text-lg text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
        >
          ‹
        </button>
        <div className="relative">
          <h2 className="text-base font-semibold capitalize text-center truncate pointer-events-none">
            {etiquetaMes}
          </h2>
          <input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            aria-label="Elegir mes y año"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md border border-[var(--color-border)] text-lg text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
        >
          ›
        </button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin movimientos este mes.</p>
        ) : (
          movimientos.map((m) => (
            <MovimientoRow
              key={m.id}
              movimiento={m}
              subcategoria={subcategoriasPorId.get(m.subcategoria_id)}
              onClick={() => setEditando(m)}
            />
          ))
        )}
      </Card>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar movimiento">
        {editando && (
          <div className="flex flex-col gap-4">
            <MovimientoForm
              initialValues={editando}
              aportacionInicial={aportacionEditando}
              onSubmit={handleUpdate}
              onCancel={() => setEditando(null)}
            />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
                emitObjetivosChanged();
                setEditando(null);
              }}
            >
              Borrar movimiento
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
