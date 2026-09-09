import { Modal } from '../ui/Modal';
import { PatrimonioForm, type PatrimonioFormValues } from './PatrimonioForm';
import { useAuth } from '../../lib/auth/useAuth';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioQuickAddSheetProps {
  open: boolean;
  posicionesExistentes: PosicionPatrimonio[];
  onClose: () => void;
  onCreated: (values: PatrimonioFormValues) => Promise<void>;
  onAjustarCuenta: (posicionId: string, importe: number, fecha: string) => Promise<void>;
}

export function PatrimonioQuickAddSheet({
  open,
  posicionesExistentes,
  onClose,
  onCreated,
  onAjustarCuenta,
}: PatrimonioQuickAddSheetProps) {
  const { session } = useAuth();

  async function handleSubmit(values: PatrimonioFormValues) {
    await onCreated(values);
    onClose();
  }

  async function handleAjustarCuenta(posicionId: string, importe: number, fecha: string) {
    await onAjustarCuenta(posicionId, importe, fecha);
    onClose();
  }

  if (!session) return null;

  return (
    <Modal open={open} onClose={onClose} title="Añadir patrimonio">
      <PatrimonioForm
        posicionesExistentes={posicionesExistentes}
        onSubmit={handleSubmit}
        onAjustarCuenta={handleAjustarCuenta}
        onCancel={onClose}
      />
    </Modal>
  );
}
