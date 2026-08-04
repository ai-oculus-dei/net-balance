import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/auth/useAuth';
import type { ModoAportacion, ObjetivoAhorro, TipoObjetivo } from '../../lib/supabase/database.types';

export interface ObjetivoFormValues {
  nombre: string;
  tipo: TipoObjetivo;
  meta: number | null;
  fecha_objetivo: string | null;
  modo_aportacion: ModoAportacion;
  porcentaje: number | null;
  usuario_id: string;
  activo: boolean;
}

interface ObjetivoFormProps {
  initialValues?: Partial<ObjetivoAhorro>;
  onSubmit: (values: ObjetivoFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ObjetivoForm({ initialValues, onSubmit, onCancel }: ObjetivoFormProps) {
  const { session } = useAuth();

  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoObjetivo>(initialValues?.tipo ?? 'acumulativo');
  const [meta, setMeta] = useState(initialValues?.meta ?? 0);
  const [fechaObjetivo, setFechaObjetivo] = useState(initialValues?.fecha_objetivo?.slice(0, 10) ?? '');
  const [modoAportacion, setModoAportacion] = useState<ModoAportacion>(initialValues?.modo_aportacion ?? 'manual');
  const [porcentaje, setPorcentaje] = useState(initialValues?.porcentaje ?? 10);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esRecurrente = tipo === 'recurrente';
  const esManual = esRecurrente || modoAportacion === 'manual';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        nombre,
        tipo,
        meta: esRecurrente ? null : meta,
        fecha_objetivo: esRecurrente ? null : fechaObjetivo || null,
        modo_aportacion: esRecurrente ? 'manual' : modoAportacion,
        porcentaje: esManual ? porcentaje : null,
        usuario_id: initialValues?.usuario_id ?? session!.user.id,
        activo: initialValues?.activo ?? true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el objetivo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Vacaciones" />

      <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoObjetivo)}>
        <option value="acumulativo">Acumulativo (con meta y fecha)</option>
        <option value="recurrente">Recurrente (tope mensual, se resetea cada mes)</option>
      </Select>

      {!esRecurrente && (
        <>
          <Input
            label="Meta (€)"
            type="number"
            step="0.01"
            min="0"
            required
            value={meta || ''}
            onChange={(e) => setMeta(Number(e.target.value))}
          />
          <Select label="Modo de aportación" value={modoAportacion} onChange={(e) => setModoAportacion(e.target.value as ModoAportacion)}>
            <option value="automatico">Automático (calcula el % necesario)</option>
            <option value="manual">Manual (fijo tú el %)</option>
          </Select>
          {modoAportacion === 'automatico' && (
            <Input
              label="Fecha objetivo"
              type="date"
              required
              value={fechaObjetivo}
              onChange={(e) => setFechaObjetivo(e.target.value)}
            />
          )}
        </>
      )}

      {esManual && (
        <Input
          label="% de ingreso real / mes"
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          value={porcentaje || ''}
          onChange={(e) => setPorcentaje(Number(e.target.value))}
        />
      )}

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
