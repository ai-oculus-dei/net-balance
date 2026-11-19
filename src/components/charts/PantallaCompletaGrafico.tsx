import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../icons/UiIcons';
import { bloquearScroll, desbloquearScroll } from '../../lib/ui/iosViewport';

const PADDING_PANTALLA_GRANDE = 32;
const ALTO_CABECERA = 48;

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
  // Controles opcionales encima del grafico (p.ej. el selector de rango 1D/1W/...), centrados
  // para no quedar bajo el boton de cerrar en ninguna orientacion.
  cabecera?: ReactNode;
}

// Overlay a pantalla completa reutilizable para cualquier grafico: en un movil en vertical, se
// rota 90 grados para aprovechar el lado largo de la pantalla como ancho del grafico (el truco
// CSS clasico de "forzar horizontal" sin depender de la Fullscreen API, poco fiable en
// Safari/PWA). En pantallas ya anchas (escritorio) no hace falta rotar, solo ampliar. Extraido de
// TarjetaGrafico para poder abrirse directamente (sin pasar por una tarjeta pequeña antes) desde
// otros sitios, p.ej. el icono de historico de un activo en ActivoCard.
export function PantallaCompletaGrafico({ abierto, onClose, render, cabecera }: PantallaCompletaGraficoProps) {
  const { ancho, alto } = useViewport();
  const esVertical = alto > ancho;
  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    bloquearScroll();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desbloquearScroll();
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-bg" style={{ animation: 'fade .18s ease' }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar pantalla grande"
        className="btn btn-icon absolute z-10"
        style={{ top: 'calc(8px + env(safe-area-inset-top))', right: 'calc(8px + env(safe-area-inset-right))' }}
      >
        <IconX />
      </button>
      {esVertical ? (
        <div
          className="absolute top-1/2 left-1/2 p-4 overflow-hidden box-border"
          style={{ width: alto, height: ancho, transform: 'translate(-50%, -50%) rotate(90deg)' }}
        >
          {cabecera && <div className="flex justify-center mb-3 px-12"><div className="w-full max-w-sm">{cabecera}</div></div>}
          {render(Math.max(ancho - PADDING_PANTALLA_GRANDE - (cabecera ? ALTO_CABECERA : 0), 160))}
        </div>
      ) : (
        <div className="w-full h-full p-4 box-border overflow-hidden">
          {cabecera && <div className="flex justify-center mb-3 px-12"><div className="w-full max-w-sm">{cabecera}</div></div>}
          {render(Math.max(alto - PADDING_PANTALLA_GRANDE - (cabecera ? ALTO_CABECERA : 0), 160))}
        </div>
      )}
    </div>,
    document.body
  );
}
