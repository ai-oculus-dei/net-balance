import { useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { IconExpandir } from '../layout/NavIcons';
import { PantallaCompletaGrafico } from './PantallaCompletaGrafico';

interface TarjetaGraficoProps {
  titulo: string;
  // Sin argumento en la vista normal (cada grafico usa su propia altura por defecto, que no es
  // igual para todos: la tarta necesita mas alto que la serie temporal). Solo en pantalla grande
  // se le pasa una altura explicita calculada a partir del viewport.
  render: (altura?: number) => ReactNode;
}

// Card de grafico con boton "Pantalla grande" (ver PantallaCompletaGrafico para el overlay en si).
export function TarjetaGrafico({ titulo, render }: TarjetaGraficoProps) {
  const [expandido, setExpandido] = useState(false);

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

      <PantallaCompletaGrafico abierto={expandido} onClose={() => setExpandido(false)} render={render} />
    </>
  );
}
