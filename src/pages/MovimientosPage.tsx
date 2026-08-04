import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { MovimientoForm, type MovimientoFormValues } from '../components/movimientos/MovimientoForm';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { rangoDelMes } from '../lib/finance/fechas';
import { indexarSubcategorias } from '../lib/finance/taxonomia';
import type { Movimiento } from '../lib/supabase/database.types';

export function MovimientosPage() {
  const [offsetMeses, setOffsetMeses] = useState(0);
  const fechaBase = useMemo(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + offsetMeses, 1);
  }, [offsetMeses]);
  const rango = useMemo(() => rangoDelMes(fechaBase), [fechaBase]);

  const { movimientos, loading, actualizar, borrar } = useMovimientos(rango);
  const { subcategorias } = useTaxonomia();
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const [editando, setEditando] = useState<Movimiento | null>(null);

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
    setEditando(null);
  }

  const etiquetaMes = fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => setOffsetMeses((o) => o - 1)}
          aria-label="Mes anterior"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md border border-[var(--color-border)] text-lg text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold capitalize text-center truncate">{etiquetaMes}</h2>
        <button
          type="button"
          onClick={() => setOffsetMeses((o) => o + 1)}
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
            <MovimientoForm initialValues={editando} onSubmit={handleUpdate} onCancel={() => setEditando(null)} />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
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
