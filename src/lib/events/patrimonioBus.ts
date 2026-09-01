// Pub-sub minimo para que cualquier pantalla que muestre patrimonio (PatrimonioPage, el
// snapshot diario al arrancar la app...) se refresque cuando el alta rapida global (montada
// en AppShell) crea/edita/archiva una posicion en otra parte del arbol de componentes.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onPatrimonioChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPatrimonioChanged(): void {
  listeners.forEach((listener) => listener());
}
