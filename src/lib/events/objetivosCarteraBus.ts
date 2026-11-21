// Avisa a quien muestre objetivos de cartera (aviso global de AppShell, grafico de Patrimonio)
// de que se ha cambiado alguno, para que se recarguen.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onObjetivosCarteraChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitObjetivosCarteraChanged(): void {
  listeners.forEach((listener) => listener());
}
