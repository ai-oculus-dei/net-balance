import { Modal } from '../ui/Modal';
import { MovimientoForm, type MovimientoFormValues } from './MovimientoForm';
import { useAuth } from '../../lib/auth/useAuth';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (values: MovimientoFormValues) => Promise<void>;
}

export function QuickAddSheet({ open, onClose, onCreated }: QuickAddSheetProps) {
  const { session } = useAuth();

  async function handleSubmit(values: MovimientoFormValues) {
    await onCreated(values);
    onClose();
  }

  if (!session) return null;

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <MovimientoForm onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}
