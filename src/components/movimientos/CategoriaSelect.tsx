import { Select } from '../ui/Select';
import type { Categoria } from '../../lib/supabase/database.types';

interface CategoriaSelectProps {
  categorias: Categoria[];
  value: number | null;
  onChange: (categoriaId: number) => void;
}

export function CategoriaSelect({ categorias, value, onChange }: CategoriaSelectProps) {
  return (
    <Select
      label="Categoría"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      required
    >
      <option value="" disabled>
        Selecciona categoría
      </option>
      {categorias.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </Select>
  );
}
