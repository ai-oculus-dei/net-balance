import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Segmented } from '../ui/Segmented';
import { FormActions, FormError } from '../ui/FormActions';
import { formatearImporte } from '../../lib/finance/formato';
import {
  margenObjetivo,
  parsearPorcentaje,
  type EtiquetaCartera,
  type ObjetivoCartera,
  type UnidadCartera,
} from '../../lib/finance/objetivosCartera';

interface ObjetivoCarteraFormProps {
  unidad: UnidadCartera;
  inicial: ObjetivoCartera | undefined;
  onSubmit: (objetivo: ObjetivoCartera) => Promise<void>;
  onCancel: () => void;
}

type OpcionEtiqueta = 'ninguna' | EtiquetaCartera;

const pct = (v: number, d = 1) => `${formatearImporte(v, d)} %`;

export function ObjetivoCarteraForm({ unidad, inicial, onSubmit, onCancel }: ObjetivoCarteraFormProps) {
  const [etiqueta, setEtiqueta] = useState<OpcionEtiqueta>(inicial?.etiqueta ?? 'ninguna');
  const [texto, setTexto] = useState(inicial?.objetivoPct != null ? String(inicial.objetivoPct) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objetivo = parsearPorcentaje(texto);
  const valido = objetivo === null || !Number.isNaN(objetivo);
  const margen = objetivo !== null && valido ? margenObjetivo(objetivo) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError('Escribe un porcentaje entre 0 y 100.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({ clave: unidad.clave, etiqueta: etiqueta === 'ninguna' ? null : etiqueta, objetivoPct: objetivo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar el objetivo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0">
          <span className="block font-medium truncate">{unidad.nombre}</span>
          {unidad.esBloque && (
            <span className="text-xs text-muted">
              {unidad.numActivos} {unidad.numActivos === 1 ? 'activo' : 'activos'} en este bloque
            </span>
          )}
        </span>
        <span className="text-right shrink-0">
          <span className="block kpi-label">Peso actual</span>
          <span className="font-mono font-semibold text-cyan">{pct(unidad.pct)}</span>
        </span>
      </div>

      <div className="field">
        <span>Etiqueta</span>
        <Segmented
          full
          ariaLabel="Etiqueta"
          value={etiqueta}
          onChange={setEtiqueta}
          options={[
            { value: 'ninguna', label: 'Ninguna' },
            { value: 'nucleo', label: 'Núcleo' },
            { value: 'satelite', label: 'Satélite' },
          ]}
        />
      </div>

      <Input
        label="Objetivo dentro de la cartera (%)"
        inputMode="decimal"
        placeholder="Sin objetivo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="font-mono"
      />

      {margen !== null && objetivo !== null && (
        <p className="notice">
          <span>
            Margen <span className="font-mono text-fg">±{formatearImporte(margen, 1)}</span> puntos: saltará un aviso si
            baja de <span className="font-mono text-fg">{pct(Math.max(0, objetivo - margen))}</span> o pasa de{' '}
            <span className="font-mono text-fg">{pct(Math.min(100, objetivo + margen))}</span>.
          </span>
        </p>
      )}
      {!valido && <FormError>Escribe un porcentaje entre 0 y 100.</FormError>}

      <FormError>{error}</FormError>
      <FormActions onCancel={onCancel} guardando={guardando} />
    </form>
  );
}
