import { Modal } from '../ui/Modal';
import { PatrimonioForm, type PatrimonioFormValues } from './PatrimonioForm';
import { useAuth } from '../../lib/auth/useAuth';

interface PatrimonioQuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (values: PatrimonioFormValues) => Promise<void>;
}

export function PatrimonioQuickAddSheet({ open, onClose, onCreated }: PatrimonioQuickAddSheetProps) {
  const { session } = useAuth();

  async function handleSubmit(values: PatrimonioFormValues) {
    await onCreated(values);
    onClose();
  }

  if (!session) return null;

  return (
    <Modal open={open} onClose={onClose} title="Añadir patrimonio">
      <PatrimonioForm onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}
