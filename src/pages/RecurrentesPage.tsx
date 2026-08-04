import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { RecurrenteForm, type RecurrenteFormValues } from '../components/recurrentes/RecurrenteForm';
import { useGastosRecurrentes } from '../hooks/useGastosRecurrentes';
import { useTaxonomia } from '../hooks/useTaxonomia';
import type { GastoRecurrente } from '../lib/supabase/database.types';

export function RecurrentesPage() {
  const { recurrentes, loading, crear, actualizar, borrar } = useGastosRecurrentes();
  const { subcategorias } = useTaxonomia();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<GastoRecurrente | null>(null);

  async function handleCrear(values: RecurrenteFormValues) {
    await crear(values);
    setCreando(false);
  }

  async function handleActualizar(values: RecurrenteFormValues) {
    if (!editando) return;
    await actualizar(editando.id, values);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Gastos fijos / recurrentes
        </h2>
        <Button onClick={() => setCreando(true)}>+ Nuevo</Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
        ) : recurrentes.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay gastos recurrentes.</p>
        ) : (
          recurrentes.map((r) => (
            <button
              key={r.id}
              onClick={() => setEditando(r)}
              className="w-full flex items-center justify-between gap-3 py-2 px-1 text-left border-b border-[var(--color-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 rounded"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{r.nombre}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Día {r.dia_del_mes} · {subcategorias.find((s) => s.id === r.subcategoria_id)?.nombre ?? '—'}
                  {!r.activo ? ' · inactivo' : ''}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-[var(--color-loss)]">
                {r.importe.toFixed(2)} €
              </span>
            </button>
          ))
        )}
      </Card>

      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo gasto recurrente">
        <RecurrenteForm onSubmit={handleCrear} onCancel={() => setCreando(false)} />
      </Modal>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar gasto recurrente">
        {editando && (
          <div className="flex flex-col gap-4">
            <RecurrenteForm initialValues={editando} onSubmit={handleActualizar} onCancel={() => setEditando(null)} />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
                setEditando(null);
              }}
            >
              Borrar gasto recurrente
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
