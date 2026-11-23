import { createContext, useEffect, useState, type ReactNode } from 'react';
import { escribirPreferencias, leerPreferencias, type Preferencias } from './preferencias';

export interface PreferenciasContextValue {
  preferencias: Preferencias;
  cambiar: (cambios: Partial<Preferencias>) => void;
}

export const PreferenciasContext = createContext<PreferenciasContextValue | undefined>(undefined);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leerPreferencias);

  useEffect(() => {
    escribirPreferencias(preferencias);
  }, [preferencias]);

  function cambiar(cambios: Partial<Preferencias>) {
    setPreferencias((p) => ({ ...p, ...cambios }));
  }

  return <PreferenciasContext.Provider value={{ preferencias, cambiar }}>{children}</PreferenciasContext.Provider>;
}
