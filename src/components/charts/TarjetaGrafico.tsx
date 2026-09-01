import { useEffect, useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { IconExpandir } from '../layout/NavIcons';

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

interface TarjetaGraficoProps {
  titulo: string;
  // Sin argumento en la vista normal (cada grafico usa su propia altura por defecto, que no es
  // igual para todos: la tarta necesita mas alto que la serie temporal). Solo en pantalla grande
  // se le pasa una altura explicita calculada a partir del viewport.
  render: (altura?: number) => ReactNode;
}

// Card de grafico con boton "Pantalla grande": en un movil en vertical, la version ampliada se
// rota 90 grados para aprovechar el lado largo de la pantalla como ancho del grafico (el
// truco CSS clasico de "forzar horizontal" sin depender de la Fullscreen API, poco fiable en
// Safari/PWA). En pantallas ya anchas (escritorio) no hace falta rotar, solo ampliar.
export function TarjetaGrafico({ titulo, render }: TarjetaGraficoProps) {
  const [expandido, setExpandido] = useState(false);
  const { ancho, alto } = useViewport();
  const esVertical = alto > ancho;

  useEffect(() => {
    if (!expandido) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpandido(false);
    }
    document.addEventListener('keydown', onKeyDown);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflowPrevio;
    };
  }, [expandido]);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{titulo}</h2>
          <button
            type="button"
            onClick={() => setExpandido(true)}
            aria-label="Pantalla grande"
            title="Pantalla grande"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
          >
            <IconExpandir className="w-4 h-4" />
          </button>
        </div>
        {render()}
      </Card>

      {expandido && (
        <div className="fixed inset-0 z-50 bg-[var(--color-surface)]">
          <button
            type="button"
            onClick={() => setExpandido(false)}
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
      )}
    </>
  );
}
