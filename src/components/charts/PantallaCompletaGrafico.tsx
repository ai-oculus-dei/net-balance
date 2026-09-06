import { useEffect, useState, type ReactNode } from 'react';

const PADDING_PANTALLA_GRANDE = 32;

function useViewport() {
  const [size, setSize] = useState(() => ({ ancho: window.innerWidth, alto: window.innerHeight }));
  useEffect(() => {
    function onResize() {
      setSize({ ancho: window.innerWidth, alto: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

interface PantallaCompletaGraficoProps {
  abierto: boolean;
  onClose: () => void;
  // Sin argumento si se llama fuera de esta pantalla; aqui siempre se llama con la altura
  // explicita calculada a partir del viewport.
  render: (altura?: number) => ReactNode;
}

// Overlay a pantalla completa reutilizable para cualquier grafico: en un movil en vertical, se
// rota 90 grados para aprovechar el lado largo de la pantalla como ancho del grafico (el truco
// CSS clasico de "forzar horizontal" sin depender de la Fullscreen API, poco fiable en
// Safari/PWA). En pantallas ya anchas (escritorio) no hace falta rotar, solo ampliar. Extraido de
// TarjetaGrafico para poder abrirse directamente (sin pasar por una tarjeta pequeña antes) desde
// otros sitios, p.ej. el icono de historico de un activo en ActivoCard.
export function PantallaCompletaGrafico({ abierto, onClose, render }: PantallaCompletaGraficoProps) {
  const { ancho, alto } = useViewport();
  const esVertical = alto > ancho;

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar pantalla grande"
        className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xl leading-none"
      >
        &times;
      </button>
      {esVertical ? (
        <div
          className="absolute top-1/2 left-1/2 p-4 overflow-hidden box-border"
          style={{ width: alto, height: ancho, transform: 'translate(-50%, -50%) rotate(90deg)' }}
        >
          {render(Math.max(ancho - PADDING_PANTALLA_GRANDE, 160))}
        </div>
      ) : (
        <div className="w-full h-full p-4 box-border overflow-hidden">
          {render(Math.max(alto - PADDING_PANTALLA_GRANDE, 160))}
        </div>
      )}
    </div>
  );
}
