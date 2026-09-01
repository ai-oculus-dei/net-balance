import { Modal } from '../ui/Modal';
import { PatrimonioForm, type PatrimonioFormValues } from './PatrimonioForm';
import { useAuth } from '../../lib/auth/useAuth';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioQuickAddSheetProps {
  open: boolean;
  posicionesExistentes: PosicionPatrimonio[];
  onClose: () => void;
  onCreated: (values: PatrimonioFormValues) => Promise<void>;
}

export function PatrimonioQuickAddSheet({ open, posicionesExistentes, onClose, onCreated }: PatrimonioQuickAddSheetProps) {
  const { session } = useAuth();

  async function handleSubmit(values: PatrimonioFormValues) {
    await onCreated(values);
    onClose();
  }

  if (!session) return null;

  return (
    <Modal open={open} onClose={onClose} title="Añadir patrimonio">
      <PatrimonioForm posicionesExistentes={posicionesExistentes} onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}
