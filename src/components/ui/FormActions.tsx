import { IconAlerta } from '../icons/UiIcons';
import { Button } from './Button';

interface FormActionsProps {
  onCancel: () => void;
  guardando: boolean;
  textoGuardar?: string;
  textoGuardando?: string;
  variante?: 'primary' | 'danger';
}

// Fila inferior de los formularios: "Cancelar" discreto y el boton principal ocupando el resto.
export function FormActions({
  onCancel,
  guardando,
  textoGuardar = 'Guardar',
  textoGuardando = 'Guardando...',
  variante = 'primary',
}: FormActionsProps) {
  return (
    <div className="flex gap-2 pt-1">
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" variant={variante} disabled={guardando} className="flex-1">
        {guardando && <span className="spin !w-4 !h-4" aria-hidden="true" />}
        {guardando ? textoGuardando : textoGuardar}
      </Button>
    </div>
  );
}

export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p className="error-text" role="alert">
      <IconAlerta />
      {children}
    </p>
  );
}
