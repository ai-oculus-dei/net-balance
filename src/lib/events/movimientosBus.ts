// Pub-sub minimo para que cualquier pantalla que liste movimientos (Dashboard, Movimientos...)
// se refresque cuando el alta rapida (montada una sola vez en AppShell, visible en toda la app)
// crea/edita/borra un movimiento en otra parte del arbol de componentes.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onMovimientosChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitMovimientosChanged(): void {
  listeners.forEach((listener) => listener());
}
