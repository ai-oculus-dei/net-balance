import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { CategoriaSelect } from '../movimientos/CategoriaSelect';
import { SubcategoriaSelect } from '../movimientos/SubcategoriaSelect';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { useAuth } from '../../lib/auth/useAuth';
import type { GastoRecurrente, Visibilidad } from '../../lib/supabase/database.types';

export interface RecurrenteFormValues {
  nombre: string;
  importe: number; // con signo: negativo = gasto fijo, positivo = ingreso recurrente (nómina, renta...)
  subcategoria_id: number;
  dia_del_mes: number;
  usuario_id: string;
  visibilidad: Visibilidad;
  activo: boolean;
  fecha_inicio: string;
}

interface RecurrenteFormProps {
  initialValues?: Partial<GastoRecurrente>;
  onSubmit: (values: RecurrenteFormValues) => Promise<void>;
  onCancel: () => void;
}

export function RecurrenteForm({ initialValues, onSubmit, onCancel }: RecurrenteFormProps) {
  const { session } = useAuth();
  const { categorias, subcategorias: todas, subcategoriasDe, loading: loadingTaxonomia } = useTaxonomia();

  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [esGasto, setEsGasto] = useState((initialValues?.importe ?? -1) < 0);
  const [importe, setImporte] = useState(initialValues?.importe !== undefined ? Math.abs(initialValues.importe) : 0);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(initialValues?.subcategoria_id ?? null);
  const [diaDelMes, setDiaDelMes] = useState(initialValues?.dia_del_mes ?? 1);
  const [visibilidad, setVisibilidad] = useState<Visibilidad>(initialValues?.visibilidad ?? 'privado');
  const [activo, setActivo] = useState(initialValues?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategorias = categoriaId !== null ? subcategoriasDe(categoriaId) : [];

  useEffect(() => {
    if (categoriaId !== null || !initialValues?.subcategoria_id || todas.length === 0) return;
    const sub = todas.find((s) => s.id === initialValues.subcategoria_id);
    if (sub) setCategoriaId(sub.categoria_id);
  }, [initialValues?.subcategoria_id, todas, categoriaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subcategoriaId) {
      setError('Selecciona una subcategoría.');
      return;
    }
    if (importe <= 0) {
      setError('Introduce un importe.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        nombre,
        importe: esGasto ? -Math.abs(importe) : Math.abs(importe),
        subcategoria_id: subcategoriaId,
        dia_del_mes: diaDelMes,
        usuario_id: initialValues?.usuario_id ?? session!.user.id,
        visibilidad,
        activo,
        fecha_inicio: initialValues?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el gasto recurrente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Alquiler, nómina..." />

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={esGasto ? 'danger' : 'secondary'} onClick={() => setEsGasto(true)}>
          Gasto
        </Button>
        <Button
          type="button"
          variant={!esGasto ? 'primary' : 'secondary'}
          className={!esGasto ? 'bg-[var(--color-gain)] hover:opacity-90' : ''}
          onClick={() => setEsGasto(false)}
        >
          Ingreso
        </Button>
      </div>

      <ImporteKeypadInput
        label="Importe (€)"
        value={importe}
        onChange={setImporte}
        colorClassName={esGasto ? 'text-[var(--color-loss)]' : 'text-[var(--color-gain)]'}
      />

      {loadingTaxonomia ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando categorías...</p>
      ) : (
        <>
          <CategoriaSelect categorias={categorias} value={categoriaId} onChange={(id) => { setCategoriaId(id); setSubcategoriaId(null); }} />
          <SubcategoriaSelect subcategorias={subcategorias} value={subcategoriaId} onChange={setSubcategoriaId} />
        </>
      )}

      <Input
        label="Día del mes"
        type="number"
        min="1"
        max="31"
        required
        value={diaDelMes}
        onChange={(e) => setDiaDelMes(Number(e.target.value))}
      />

      <Select label="Visibilidad" value={visibilidad} onChange={(e) => setVisibilidad(e.target.value as Visibilidad)}>
        <option value="privado">Privado</option>
        <option value="compartido">Compartido</option>
      </Select>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Activo
      </label>

      {error && <p className="text-sm text-[var(--color-loss)]">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
