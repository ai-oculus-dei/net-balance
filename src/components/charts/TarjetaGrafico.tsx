import { useState, type ReactNode } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { IconExpandir } from '../layout/NavIcons';
import { PantallaCompletaGrafico } from './PantallaCompletaGrafico';

interface TarjetaGraficoProps {
  titulo: string;
  icono?: ReactNode;
  // Sin argumento en la vista normal (cada grafico usa su propia altura por defecto, que no es
  // igual para todos: la tarta necesita mas alto que la serie temporal). Solo en pantalla grande
  // se le pasa una altura explicita calculada a partir del viewport.
  render: (altura?: number) => ReactNode;
}

// Card de grafico con boton "Pantalla grande" (ver PantallaCompletaGrafico para el overlay en si).
export function TarjetaGrafico({ titulo, icono, render }: TarjetaGraficoProps) {
  const [expandido, setExpandido] = useState(false);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <CardTitle icon={icono}>{titulo}</CardTitle>
          <button
            type="button"
            onClick={() => setExpandido(true)}
            aria-label="Pantalla grande"
            title="Pantalla grande"
            className="icon-btn shrink-0 -my-1.5 -mr-1.5"
          >
            <IconExpandir />
          </button>
        </div>
        {render()}
      </Card>

      <PantallaCompletaGrafico abierto={expandido} onClose={() => setExpandido(false)} render={render} />
    </>
  );
}
