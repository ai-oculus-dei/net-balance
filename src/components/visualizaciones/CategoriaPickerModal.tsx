import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { LineaSeleccion } from '../../lib/finance/visualizaciones';
import type { Categoria, Subcategoria } from '../../lib/supabase/database.types';

interface CategoriaPickerModalProps {
  open: boolean;
  onClose: () => void;
  categorias: Categoria[];
  subcategoriasDe: (categoriaId: number) => Subcategoria[];
  lineas: LineaSeleccion[];
  maxLineas: number;
  onToggle: (categoriaId: number, subcategoriaId: number | null) => void;
}

function estaSeleccionada(lineas: LineaSeleccion[], categoriaId: number, subcategoriaId: number | null): boolean {
  return lineas.some((l) => l.categoriaId === categoriaId && l.subcategoriaId === subcategoriaId);
}

// Selector de categorias/subcategorias para Visualizaciones: en vez de rellenar lineas una a
// una con desplegables, aqui se ve de golpe la misma lista de nombres que en Resumen
// Categorias y se pulsa directamente sobre el nombre para (des)seleccionarlo. Seleccionado =
// texto normal (blanco); sin seleccionar = atenuado (gris), igual que categorias/subcategorias
// se distinguen en el resto de la app.
export function CategoriaPickerModal({
  open,
  onClose,
  categorias,
  subcategoriasDe,
  lineas,
  maxLineas,
  onToggle,
}: CategoriaPickerModalProps) {
  const seleccionadas = lineas.length;

  return (
    <Modal open={open} onClose={onClose} title={`Elegir categorías (${seleccionadas}/${maxLineas})`}>
      <div className="flex flex-col gap-3">
        {categorias.map((categoria) => {
          const subcategorias = subcategoriasDe(categoria.id);
          const categoriaSeleccionada = estaSeleccionada(lineas, categoria.id, null);
          return (
            <div key={categoria.id}>
              <button
                type="button"
                onClick={() => onToggle(categoria.id, null)}
                disabled={!categoriaSeleccionada && seleccionadas >= maxLineas}
                className={`block w-full text-left text-xs font-semibold uppercase tracking-wide py-1 disabled:opacity-30 ${
                  categoriaSeleccionada ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {categoria.nombre}
              </button>
              <div className="flex flex-col">
                {subcategorias.map((sub) => {
                  const subSeleccionada = estaSeleccionada(lineas, categoria.id, sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onToggle(categoria.id, sub.id)}
                      disabled={!subSeleccionada && seleccionadas >= maxLineas}
                      className={`text-left text-sm py-1 pl-3 disabled:opacity-30 ${
                        subSeleccionada ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {sub.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Button type="button" className="mt-4 w-full" onClick={onClose}>
        Listo
      </Button>
    </Modal>
  );
}
