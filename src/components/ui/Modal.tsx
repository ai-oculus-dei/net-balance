import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Por defecto, hoja inferior en movil (pegada abajo, con hueco para que el boton de guardar
  // no quede tapado por el teclado). `centrado` la muestra siempre centrada en vertical, para
  // dialogos cortos (avisos/confirmaciones) donde no tiene sentido el patron de hoja inferior.
  centrado?: boolean;
}

export function Modal({ open, onClose, title, children, centrado = false }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/50 ${
        centrado ? 'items-center' : 'items-end sm:items-center pb-8 sm:pb-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-5 max-h-[90vh] overflow-y-auto ${
          centrado ? 'max-w-md mx-4 rounded-2xl' : 'sm:max-w-md rounded-t-2xl sm:rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
