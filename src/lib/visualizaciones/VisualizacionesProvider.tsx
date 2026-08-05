import { createContext, useState, type ReactNode } from 'react';
import type { LineaSeleccion } from '../finance/visualizaciones';
import { formatearMes } from '../finance/fechas';

// Estado de la pagina de Visualizaciones montado aqui (por encima de las rutas, en AppShell)
// para que sobreviva a cambiar de pestaña sin perderse — pero es solo memoria de React: al
// cerrar la app (recargar la pagina) se pierde, no se persiste en localStorage a proposito.
export interface VisualizacionesState {
  desdeMes: string;
  hastaMes: string;
  lineas: LineaSeleccion[];
}

type ActualizadorLineas = LineaSeleccion[] | ((actuales: LineaSeleccion[]) => LineaSeleccion[]);

export interface VisualizacionesContextValue extends VisualizacionesState {
  setDesdeMes: (mes: string) => void;
  setHastaMes: (mes: string) => void;
  setLineas: (actualizador: ActualizadorLineas) => void;
}

export const VisualizacionesContext = createContext<VisualizacionesContextValue | undefined>(undefined);

function estadoInicial(): VisualizacionesState {
  const hoy = new Date();
  return {
    desdeMes: formatearMes(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)),
    hastaMes: formatearMes(hoy),
    lineas: [],
  };
}

export function VisualizacionesProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<VisualizacionesState>(estadoInicial);

  function setDesdeMes(desdeMes: string) {
    setEstado((e) => ({ ...e, desdeMes }));
  }

  function setHastaMes(hastaMes: string) {
    setEstado((e) => ({ ...e, hastaMes }));
  }

  function setLineas(actualizador: ActualizadorLineas) {
    setEstado((e) => ({
      ...e,
      lineas: typeof actualizador === 'function' ? actualizador(e.lineas) : actualizador,
    }));
  }

  return (
    <VisualizacionesContext.Provider value={{ ...estado, setDesdeMes, setHastaMes, setLineas }}>
      {children}
    </VisualizacionesContext.Provider>
  );
}
