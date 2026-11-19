import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Cargando } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { IconObjetivos } from '../components/layout/NavIcons';
import { IconPapelera, IconPlus } from '../components/icons/UiIcons';
import { Modal } from '../components/ui/Modal';
import { ObjetivoCard } from '../components/objetivos/ObjetivoCard';
import { ObjetivoForm, type ObjetivoFormValues } from '../components/objetivos/ObjetivoForm';
import { useObjetivos } from '../hooks/useObjetivos';
import { useDisponibleMes } from '../hooks/useDisponibleMes';
import { calcularAportacionDeseada } from '../lib/finance/calcularAportacionDeseada';
import type { ObjetivoAhorro } from '../lib/supabase/database.types';

export function ObjetivosPage() {
  const { objetivos, loading, crear, actualizar, borrar } = useObjetivos();
  const hoy = useMemo(() => new Date(), []);
  const { ingresoReal, loading: loadingIngreso } = useDisponibleMes(hoy);
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
      <PageHeader
        icon={<IconObjetivos />}
        title="Objetivos"
        sub={loading ? 'cargando…' : `${objetivos.filter((o) => o.activo).length} activos · ${objetivos.length} en total`}
        right={
          <Button onClick={() => setCreando(true)} className="btn-sm !min-h-[36px]">
            <IconPlus />
            Nuevo
          </Button>
        }
      />

      {loading || loadingIngreso ? (
        <Cargando />
      ) : objetivos.length === 0 ? (
        <p className="empty card">Todavía no tienes objetivos.</p>
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
          <div className="flex flex-col gap-3">
            <ObjetivoForm initialValues={editando} onSubmit={handleActualizar} onCancel={() => setEditando(null)} />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
                setEditando(null);
              }}
            >
              <IconPapelera />
              Borrar objetivo
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
