import { useEffect, useState } from 'react';

// Devuelve `valor`, pero retrasado: solo se actualiza cuando `valor` lleva `retrasoMs` sin
// cambiar. Para separar una interaccion que debe sentirse instantanea (p.ej. marcar/desmarcar
// una categoria) de un recalculo caro que depende de ella (graficos), sin recalcular en cada
// pulsacion suelta.
export function useDebounced<T>(valor: T, retrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), retrasoMs);
    return () => clearTimeout(id);
  }, [valor, retrasoMs]);

  return debounced;
}
