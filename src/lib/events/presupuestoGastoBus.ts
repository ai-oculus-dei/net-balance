// Avisa a quien muestre objetivos de gasto (aviso global de AppShell, tarjeta de Ajustes) de que
// se han cambiado, para que se recarguen.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onPresupuestoGastoChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPresupuestoGastoChanged(): void {
  listeners.forEach((listener) => listener());
}
