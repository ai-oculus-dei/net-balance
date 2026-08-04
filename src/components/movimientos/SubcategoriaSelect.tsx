import { Select } from '../ui/Select';
import type { Subcategoria } from '../../lib/supabase/database.types';

interface SubcategoriaSelectProps {
  subcategorias: Subcategoria[];
  value: number | null;
  onChange: (subcategoriaId: number) => void;
}

export function SubcategoriaSelect({ subcategorias, value, onChange }: SubcategoriaSelectProps) {
  return (
    <Select
      label="Subcategoría"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      required
      disabled={subcategorias.length === 0}
    >
      <option value="" disabled>
        Selecciona subcategoría
      </option>
      {subcategorias.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </Select>
  );
}
