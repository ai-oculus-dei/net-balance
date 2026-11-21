import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../icons/UiIcons';
import { bloquearScroll, desbloquearScroll } from '../../lib/ui/iosViewport';

const MARGEN = 16;
const ALTO_MINIMO = 160;

interface Medidas {
  ancho: number;
  alto: number;
}

// Mide un elemento con ResizeObserver. Se usa en vez de window.innerWidth/innerHeight porque en
// iOS (sobre todo en la PWA instalada) el evento resize llega antes de que el viewport tenga sus
// medidas nuevas al girar el movil: con esos valores viejos el grafico quedaba descolocado arriba
// a la izquierda. ResizeObserver avisa despues del layout, con las medidas reales.
function useMedidas<T extends HTMLElement>(activo: boolean) {
  const ref = useRef<T | null>(null);
  const [medidas, setMedidas] = useState<Medidas | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!activo || !el) return;
    const medir = () => setMedidas({ ancho: el.clientWidth, alto: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activo]);
  return [ref, medidas] as const;
}

interface PantallaCompletaGraficoProps {
  abierto: boolean;
  onClose: () => void;
  // Sin argumento si se llama fuera de esta pantalla; aqui siempre se llama con la altura
  // explicita que queda libre para el grafico.
  render: (altura?: number) => ReactNode;
  // Controles opcionales encima del grafico (p.ej. el selector de rango 1D/1W/...), centrados
  // para no quedar bajo el boton de cerrar en ninguna orientacion.
  cabecera?: ReactNode;
}

// Overlay a pantalla completa reutilizable para cualquier grafico: en un movil en vertical, se
// rota 90 grados para aprovechar el lado largo de la pantalla como ancho del grafico (el truco
// CSS clasico de "forzar horizontal" sin depender de la Fullscreen API, poco fiable en
// Safari/PWA). En pantallas ya anchas (escritorio o movil girado) no hace falta rotar.
//
// Zonas seguras del iPhone (isla dinamica, barra de inicio): al rotar 90 grados en sentido
// horario, el borde izquierdo del contenido queda arriba en la pantalla (donde esta la isla), el
// superior a la derecha, el derecho abajo y el inferior a la izquierda — por eso los margenes del
// contenido rotado usan los env(safe-area-inset-*) de esos lados.
export function PantallaCompletaGrafico({ abierto, onClose, render, cabecera }: PantallaCompletaGraficoProps) {
  const [refPantalla, pantalla] = useMedidas<HTMLDivElement>(abierto);
  // La zona del grafico solo existe cuando ya se conoce el tamano de la pantalla.
  const [refZona, zona] = useMedidas<HTMLDivElement>(abierto && pantalla !== null);

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

  const esVertical = pantalla !== null && pantalla.alto > pantalla.ancho;
  const m = (lado: 'top' | 'right' | 'bottom' | 'left') => `calc(${MARGEN}px + env(safe-area-inset-${lado}))`;

  const estiloContenido: CSSProperties = esVertical
    ? {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: pantalla.alto,
        height: pantalla.ancho,
        transform: 'translate(-50%, -50%) rotate(90deg)',
        paddingLeft: m('top'),
        paddingTop: m('right'),
        paddingRight: m('bottom'),
        paddingBottom: m('left'),
      }
    : {
        position: 'absolute',
        inset: 0,
        paddingTop: m('top'),
        paddingRight: m('right'),
        paddingBottom: m('bottom'),
        paddingLeft: m('left'),
      };

  return createPortal(
    <div ref={refPantalla} className="fixed inset-0 z-[70] bg-bg overflow-hidden" style={{ animation: 'fade .18s ease' }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar pantalla grande"
        className="btn btn-icon absolute z-10"
        style={{ top: 'calc(8px + env(safe-area-inset-top))', right: 'calc(8px + env(safe-area-inset-right))' }}
      >
        <IconX />
      </button>
      {pantalla && (
        <div className="flex flex-col box-border overflow-hidden" style={estiloContenido}>
          {cabecera && (
            <div className="flex justify-center mb-3 px-12 shrink-0">
              <div className="w-full max-w-sm">{cabecera}</div>
            </div>
          )}
          <div ref={refZona} className="flex-1 min-h-0">
            {zona && render(Math.max(zona.alto, ALTO_MINIMO))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
