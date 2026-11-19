import { useState, type ReactNode } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { IconExpandir } from '../layout/NavIcons';
import { PantallaCompletaGrafico } from './PantallaCompletaGrafico';

interface TarjetaGraficoProps {
  titulo: string;
  icono?: ReactNode;
  // Controles junto al boton de pantalla grande (p.ej. el selector de rango 1D/1W/...). Se
  // muestran tambien en la pantalla grande, con el mismo estado.
  acciones?: ReactNode;
  // Sin argumento en la vista normal (cada grafico usa su propia altura por defecto, que no es
  // igual para todos: la tarta necesita mas alto que la serie temporal). Solo en pantalla grande
  // se le pasa una altura explicita calculada a partir del viewport.
  render: (altura?: number) => ReactNode;
}

// Card de grafico con boton "Pantalla grande" (ver PantallaCompletaGrafico para el overlay en si).
export function TarjetaGrafico({ titulo, icono, acciones, render }: TarjetaGraficoProps) {
  const [expandido, setExpandido] = useState(false);

  const botonExpandir = (
    <button
      type="button"
      onClick={() => setExpandido(true)}
      aria-label="Pantalla grande"
      title="Pantalla grande"
      className={`icon-btn shrink-0 ${acciones ? '' : '-my-1.5 -mr-1.5'}`}
    >
      <IconExpandir />
    </button>
  );

  return (
    <>
      <Card>
        {acciones ? (
          // Con controles: titulo arriba y, debajo, los controles con el boton de pantalla grande
          // al lado (en una sola fila no caben a 360 px).
          <div className="flex flex-col gap-2.5 mb-3">
            <CardTitle icon={icono}>{titulo}</CardTitle>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-0">{acciones}</div>
              {botonExpandir}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mb-3">
            <CardTitle icon={icono}>{titulo}</CardTitle>
            {botonExpandir}
          </div>
        )}
        {render()}
      </Card>

      <PantallaCompletaGrafico
        abierto={expandido}
        onClose={() => setExpandido(false)}
        render={render}
        cabecera={acciones}
      />
    </>
  );
}
