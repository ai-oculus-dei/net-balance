import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { CategoriaSelect } from './CategoriaSelect';
import { SubcategoriaSelect } from './SubcategoriaSelect';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuth } from '../../lib/auth/useAuth';
import type { Movimiento, Visibilidad } from '../../lib/supabase/database.types';

export interface MovimientoFormValues {
  nombre: string;
  fecha: string; // datetime-local
  importe: number; // con signo
  subcategoria_id: number;
  usuario_id: string;
  visibilidad: Visibilidad;
  nota: string;
}

interface MovimientoFormProps {
  initialValues?: Partial<Movimiento>;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
  onCancel: () => void;
}

function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MovimientoForm({ initialValues, onSubmit, onCancel }: MovimientoFormProps) {
  const { session } = useAuth();
  const { categorias, subcategorias: todasLasSubcategorias, subcategoriasDe, loading: loadingTaxonomia } = useTaxonomia();
  const { profiles } = useProfiles();

  const subInicial = initialValues?.subcategoria_id ?? null;

  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [fecha, setFecha] = useState(toDatetimeLocal(initialValues?.fecha));
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(subInicial);
  const [esGasto, setEsGasto] = useState((initialValues?.importe ?? -1) < 0);
  const [magnitud, setMagnitud] = useState(
    initialValues?.importe !== undefined ? Math.abs(initialValues.importe) : 0
  );
  const [usuarioId, setUsuarioId] = useState(initialValues?.usuario_id ?? session?.user.id ?? '');
  const [visibilidad, setVisibilidad] = useState<Visibilidad>(initialValues?.visibilidad ?? 'privado');
  const [nota, setNota] = useState(initialValues?.nota ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategorias = categoriaId !== null ? subcategoriasDe(categoriaId) : [];

  // Al editar un movimiento existente, deriva la categoria a partir de su subcategoria
  // en cuanto la taxonomia termina de cargar (solo tenemos subcategoria_id guardado).
  useEffect(() => {
    if (categoriaId !== null || !subInicial || todasLasSubcategorias.length === 0) return;
    const sub = todasLasSubcategorias.find((s) => s.id === subInicial);
    if (sub) setCategoriaId(sub.categoria_id);
  }, [subInicial, todasLasSubcategorias, categoriaId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subcategoriaId) {
      setError('Selecciona una subcategoría.');
      return;
    }
    if (magnitud <= 0) {
      setError('Introduce un importe.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        nombre,
        fecha: new Date(fecha).toISOString(),
        importe: esGasto ? -Math.abs(magnitud) : Math.abs(magnitud),
        subcategoria_id: subcategoriaId,
        usuario_id: usuarioId,
        visibilidad,
        nota,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        label="Importe"
        value={magnitud}
        onChange={setMagnitud}
        colorClassName={esGasto ? 'text-[var(--color-loss)]' : 'text-[var(--color-gain)]'}
      />

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Cena viernes" />

      {loadingTaxonomia ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando categorías...</p>
      ) : (
        <>
          <CategoriaSelect categorias={categorias} value={categoriaId} onChange={(id) => { setCategoriaId(id); setSubcategoriaId(null); }} />
          <SubcategoriaSelect subcategorias={subcategorias} value={subcategoriaId} onChange={setSubcategoriaId} />
        </>
      )}

      <Input label="Fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

      <Select label="Usuario" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>

      <Select label="Visibilidad" value={visibilidad} onChange={(e) => setVisibilidad(e.target.value as Visibilidad)}>
        <option value="privado">Privado</option>
        <option value="compartido">Compartido</option>
      </Select>

      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />

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
