import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Segmented } from '../ui/Segmented';
import { FormActions, FormError } from '../ui/FormActions';
import { formatearImporte } from '../../lib/finance/formato';
import {
  margenObjetivo,
  objetivoEfectivoPct,
  parsearEuros,
  parsearPorcentaje,
  type EtiquetaCartera,
  type ObjetivoCartera,
  type UnidadCartera,
} from '../../lib/finance/objetivosCartera';

interface ObjetivoCarteraFormProps {
  unidad: UnidadCartera;
  inicial: ObjetivoCartera | undefined;
  // Patrimonio total actual: base para pasar un objetivo en euros a %.
  totalPatrimonio: number;
  onSubmit: (objetivo: ObjetivoCartera) => Promise<void>;
  onCancel: () => void;
}

type OpcionEtiqueta = 'ninguna' | EtiquetaCartera;
type Unidad = 'pct' | 'eur';

const pct = (v: number, d = 1) => `${formatearImporte(v, d)} %`;
const eur = (v: number) => `${formatearImporte(v, 0)} €`;

function textoInicial(o: ObjetivoCartera | undefined): string {
  if (o?.objetivoEur != null) return formatearImporte(o.objetivoEur, o.objetivoEur % 1 === 0 ? 0 : 2);
  if (o?.objetivoPct != null) return String(o.objetivoPct).replace('.', ',');
  return '';
}

export function ObjetivoCarteraForm({ unidad, inicial, totalPatrimonio, onSubmit, onCancel }: ObjetivoCarteraFormProps) {
  const [etiqueta, setEtiqueta] = useState<OpcionEtiqueta>(inicial?.etiqueta ?? 'ninguna');
  const [unidadObjetivo, setUnidadObjetivo] = useState<Unidad>(inicial?.objetivoEur != null ? 'eur' : 'pct');
  const [texto, setTexto] = useState(() => textoInicial(inicial));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valor = unidadObjetivo === 'pct' ? parsearPorcentaje(texto) : parsearEuros(texto);
  const valido = valor === null || !Number.isNaN(valor);
  const objetivoPct =
    valor === null || !valido
      ? null
      : objetivoEfectivoPct(
          unidadObjetivo === 'pct' ? { objetivoPct: valor, objetivoEur: null } : { objetivoPct: null, objetivoEur: valor },
          totalPatrimonio
        );
  const margen = objetivoPct !== null ? margenObjetivo(objetivoPct) : null;
  const mensajeInvalido = unidadObjetivo === 'pct' ? 'Escribe un porcentaje entre 0 y 100.' : 'Escribe una cantidad en euros.';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError(mensajeInvalido);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        clave: unidad.clave,
        etiqueta: etiqueta === 'ninguna' ? null : etiqueta,
        objetivoPct: unidadObjetivo === 'pct' ? valor : null,
        objetivoEur: unidadObjetivo === 'eur' ? valor : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar el objetivo.');
    } finally {
      setGuardando(false);
    }
  }

  // Rango de aviso en la misma unidad en la que se ha escrito el objetivo.
  const desde = objetivoPct !== null && margen !== null ? Math.max(0, objetivoPct - margen) : 0;
  const hasta = objetivoPct !== null && margen !== null ? Math.min(100, objetivoPct + margen) : 0;
  const enUnidad = (p: number) => (unidadObjetivo === 'pct' ? pct(p) : eur((p / 100) * totalPatrimonio));

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
          <span className="block font-mono text-[11px] text-muted">{eur(unidad.valor)}</span>
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

      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <Input
            label="Objetivo dentro de la cartera"
            inputMode="decimal"
            placeholder="Sin objetivo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="font-mono"
          />
        </div>
        <Segmented
          ariaLabel="Unidad del objetivo"
          value={unidadObjetivo}
          onChange={(u) => {
            setUnidadObjetivo(u);
            setTexto('');
          }}
          options={[
            { value: 'pct', label: '%' },
            { value: 'eur', label: '€' },
          ]}
        />
      </div>

      {objetivoPct !== null && margen !== null && valor !== null && (
        <p className="notice">
          <span>
            {unidadObjetivo === 'eur' && (
              <>
                <span className="font-mono text-fg">{eur(valor)}</span> son hoy el{' '}
                <span className="font-mono text-fg">{pct(objetivoPct)}</span> de tu cartera sin el Fondo de Emergencia ({eur(totalPatrimonio)}): el %
                se recalcula solo cuando cambie el patrimonio.{' '}
              </>
            )}
            Margen <span className="font-mono text-fg">±{formatearImporte(margen, 1)}</span> puntos: saltará un aviso si baja de{' '}
            <span className="font-mono text-fg">{enUnidad(desde)}</span> o pasa de{' '}
            <span className="font-mono text-fg">{enUnidad(hasta)}</span>
            {unidadObjetivo === 'eur' ? ' (con el patrimonio de hoy)' : ''}.
          </span>
        </p>
      )}
      {!valido && <FormError>{mensajeInvalido}</FormError>}

      <FormError>{error}</FormError>
      <FormActions onCancel={onCancel} guardando={guardando} />
    </form>
  );
}
