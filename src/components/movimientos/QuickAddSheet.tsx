import { Modal } from '../ui/Modal';
import { MovimientoForm, type MovimientoFormValues } from './MovimientoForm';
import { useAuth } from '../../lib/auth/useAuth';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (values: MovimientoFormValues) => Promise<void>;
  cuentasAhorro: PosicionPatrimonio[];
}

export function QuickAddSheet({ open, onClose, onCreated, cuentasAhorro }: QuickAddSheetProps) {
  const { session } = useAuth();

  async function handleSubmit(values: MovimientoFormValues) {
    await onCreated(values);
    onClose();
  }

  if (!session) return null;

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <MovimientoForm onSubmit={handleSubmit} onCancel={onClose} cuentasAhorro={cuentasAhorro} />
    </Modal>
  );
}
