import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../icons/UiIcons';
import { apilarHoja, bloquearScroll, desapilarHoja, desbloquearScroll, esHojaSuperior } from '../../lib/ui/iosViewport';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Por defecto, hoja inferior en movil (pegada abajo, sube por encima del teclado). `centrado`
  // la muestra siempre centrada en vertical, para dialogos cortos (avisos/confirmaciones) donde
  // no tiene sentido el patron de hoja inferior.
  centrado?: boolean;
}

// Distancia (px) que hay que arrastrar la barrita hacia abajo para cerrar la hoja.
const UMBRAL_CIERRE_PX = 90;

export function Modal({ open, onClose, title, children, centrado = false }: ModalProps) {
  if (!open) return null;
  return createPortal(
    <Hoja onClose={onClose} title={title} centrado={centrado}>
      {children}
    </Hoja>,
    document.body
  );
}

function Hoja({ onClose, title, children, centrado }: Omit<ModalProps, 'open'>) {
  const idRef = useRef(Symbol('hoja'));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [arrastre, setArrastre] = useState(0);
  const inicioY = useRef<number | null>(null);

  // Bloqueo del fondo + pila para Escape (solo cierra la hoja de arriba).
  useEffect(() => {
    const id = idRef.current;
    bloquearScroll();
    apilarHoja(id);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && esHojaSuperior(id)) {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desapilarHoja(id);
      desbloquearScroll();
    };
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    inicioY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (inicioY.current === null) return;
    setArrastre(Math.max(0, e.clientY - inicioY.current));
  }

  function onPointerUp() {
    if (inicioY.current === null) return;
    inicioY.current = null;
    if (arrastre > UMBRAL_CIERRE_PX) onClose();
    setArrastre(0);
  }

  return (
    <div className={`sheet-backdrop ${centrado ? 'centered' : ''}`} onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={
          arrastre > 0
            ? { transform: `translateY(${arrastre}px)`, transition: 'none' }
            : { transition: 'transform .2s cubic-bezier(.2,.8,.2,1)' }
        }
      >
        {!centrado && (
          <div
            className="grab-zone"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="grab" />
          </div>
        )}
        <div className={`sheet-head ${centrado ? 'pt-1' : ''}`}>
          <h2 className="sheet-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="btn btn-ghost btn-icon">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
