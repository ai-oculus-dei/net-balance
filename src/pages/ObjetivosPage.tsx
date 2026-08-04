import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ObjetivoCard } from '../components/objetivos/ObjetivoCard';
import { ObjetivoForm, type ObjetivoFormValues } from '../components/objetivos/ObjetivoForm';
import { useObjetivos } from '../hooks/useObjetivos';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { calcularAportacionDeseada } from '../lib/finance/calcularAportacionDeseada';
import type { ObjetivoAhorro } from '../lib/supabase/database.types';

export function ObjetivosPage() {
  const { objetivos, loading, crear, actualizar, borrar } = useObjetivos();
  const { ingresoReal, loading: loadingIngreso } = useDisponibleMes();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<ObjetivoAhorro | null>(null);

  async function handleCrear(values: ObjetivoFormValues) {
    await crear(values);
    setCreando(false);
  }

  async function handleActualizar(values: ObjetivoFormValues) {
    if (!editando) return;
    await actualizar(editando.id, values);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Objetivos de ahorro
        </h2>
        <Button onClick={() => setCreando(true)}>+ Nuevo</Button>
      </div>

      {loading || loadingIngreso ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : objetivos.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Todavía no tienes objetivos.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {objetivos.map((o) => (
            <ObjetivoCard
              key={o.id}
              objetivo={o}
              aportacionMensual={calcularAportacionDeseada(o, ingresoReal)}
              onClick={() => setEditando(o)}
            />
          ))}
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo objetivo">
        <ObjetivoForm onSubmit={handleCrear} onCancel={() => setCreando(false)} />
      </Modal>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar objetivo">
        {editando && (
          <div className="flex flex-col gap-4">
            <ObjetivoForm initialValues={editando} onSubmit={handleActualizar} onCancel={() => setEditando(null)} />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
                setEditando(null);
              }}
            >
              Borrar objetivo
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
