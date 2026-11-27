// Avisa a todos los useTaxonomia de que ha cambiado la taxonomia (p.ej. la clasificacion
// fijo/variable de una subcategoria), para que se recarguen.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onTaxonomiaChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTaxonomiaChanged(): void {
  listeners.forEach((listener) => listener());
}
