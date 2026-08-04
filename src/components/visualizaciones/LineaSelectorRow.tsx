import { CategoriaSelect } from '../movimientos/CategoriaSelect';
import { Select } from '../ui/Select';
import { colorCategorico } from '../charts/colorsCategoricos';
import type { LineaSeleccion } from '../../lib/finance/visualizaciones';
import type { Categoria, Subcategoria } from '../../lib/supabase/database.types';
import type { Theme } from '../../lib/theme/ThemeProvider';

interface LineaSelectorRowProps {
  linea: LineaSeleccion;
  categorias: Categoria[];
  subcategoriasDe: (categoriaId: number) => Subcategoria[];
  theme: Theme;
  onChangeCategoria: (categoriaId: number) => void;
  onChangeSubcategoria: (subcategoriaId: number | null) => void;
  onRemove: () => void;
}

export function LineaSelectorRow({
  linea,
  categorias,
  subcategoriasDe,
  theme,
  onChangeCategoria,
  onChangeSubcategoria,
  onRemove,
}: LineaSelectorRowProps) {
  const subcategorias = linea.categoriaId !== null ? subcategoriasDe(linea.categoriaId) : [];
  const color = colorCategorico(linea.colorIndex, theme);

  return (
    <div className="flex items-end gap-2">
      <span
        className="w-3 h-3 rounded-full shrink-0 mb-2.5"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex-1">
        <CategoriaSelect categorias={categorias} value={linea.categoriaId} onChange={onChangeCategoria} />
      </div>
      <div className="flex-1">
        <Select
          label="Subcategoría"
          value={linea.subcategoriaId ?? ''}
          onChange={(e) => onChangeSubcategoria(e.target.value === '' ? null : Number(e.target.value))}
          disabled={linea.categoriaId === null}
        >
          <option value="">Todas</option>
          {subcategorias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar línea"
        className="mb-0.5 w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
      >
        ×
      </button>
    </div>
  );
}
