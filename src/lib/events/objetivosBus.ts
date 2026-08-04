// Pub-sub minimo (ver movimientosBus.ts) para que Objetivos/Dashboard se refresquen cuando
// el alta rapida de un gasto de "Ahorro" (montada en AppShell) crea/edita una aportacion que
// cambia el "acumulado" de un objetivo desde otra parte del arbol de componentes.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onObjetivosChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitObjetivosChanged(): void {
  listeners.forEach((listener) => listener());
}
