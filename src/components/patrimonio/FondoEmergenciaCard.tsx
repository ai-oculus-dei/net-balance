import { useState, type FormEvent } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { ProgressBar } from '../ui/ProgressBar';
import { Cargando } from '../ui/Spinner';
import { FormActions, FormError } from '../ui/FormActions';
import { IconCheck, IconEscudo } from '../icons/UiIcons';
import { formatearImporte } from '../../lib/finance/formato';
import {
  CLAVE_BLOQUE_LIQUIDEZ,
  NOMBRE_FONDO_EMERGENCIA,
  parsearEuros,
  type ObjetivoCartera,
} from '../../lib/finance/objetivosCartera';

interface FondoEmergenciaCardProps {
  valor: number; // lo que hay ahora en cuentas y fondos monetarios
  objetivo: ObjetivoCartera | undefined; // fila de bloque:liquidez (se usa su objetivoEur)
  loading: boolean;
  onGuardar: (objetivo: ObjetivoCartera) => Promise<void>;
}

const eur = (v: number) => `${formatearImporte(v, 0)} €`;

// Barra de progreso del Fondo de Emergencia: lo que hay en cuentas y fondos monetarios frente a su
// objetivo en euros. Tocar la tarjeta abre el formulario para fijar ese objetivo.
export function FondoEmergenciaCard({ valor, objetivo, loading, onGuardar }: FondoEmergenciaCardProps) {
  const [editando, setEditando] = useState(false);
  const meta = objetivo?.objetivoEur ?? null;
  const progreso = meta !== null && meta > 0 ? (valor / meta) * 100 : null;
  const completo = progreso !== null && progreso >= 100;

  return (
    <>
    <Card onClick={() => setEditando(true)} className="cursor-pointer">
      <div className="flex items-center justify-between gap-3 mb-3">
        <CardTitle icon={<IconEscudo />}>{NOMBRE_FONDO_EMERGENCIA}</CardTitle>
        {progreso !== null && (
          <span className={`font-mono text-sm font-semibold flex items-center gap-1 ${completo ? 'text-ok' : 'text-cyan'}`}>
            {completo && <IconCheck className="w-4 h-4" />}
            {formatearImporte(Math.min(progreso, 999), 0)} %
          </span>
        )}
      </div>

      {loading ? (
        <Cargando />
      ) : (
        <>
          <ProgressBar value={progreso ?? 0} color={completo ? 'var(--ok)' : 'var(--cyan)'} />
          <div className="flex items-center justify-between gap-3 mt-2 font-mono text-[12px]">
            <span className="text-fg">{eur(valor)}</span>
            <span className="text-muted">{meta !== null ? `objetivo ${eur(meta)}` : 'toca para fijar el objetivo'}</span>
          </div>
        </>
      )}
    </Card>

    {/* Fuera de la tarjeta: los eventos de React atraviesan los portales, y un toque en el fondo
        de la hoja (que la cierra) llegaria a la tarjeta y la volveria a abrir. */}
      <Modal open={editando} onClose={() => setEditando(false)} title={NOMBRE_FONDO_EMERGENCIA}>
        {editando && (
          <FormularioObjetivo
            valor={valor}
            inicial={meta}
            onCancel={() => setEditando(false)}
            onSubmit={async (objetivoEur) => {
              await onGuardar({
                clave: CLAVE_BLOQUE_LIQUIDEZ,
                etiqueta: objetivo?.etiqueta ?? null,
                objetivoPct: null,
                objetivoEur,
              });
              setEditando(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function FormularioObjetivo({
  valor,
  inicial,
  onSubmit,
  onCancel,
}: {
  valor: number;
  inicial: number | null;
  onSubmit: (objetivoEur: number | null) => Promise<void>;
  onCancel: () => void;
}) {
  // Sin separador de miles: es lo que se va a seguir editando a mano.
  const [texto, setTexto] = useState(inicial !== null ? String(inicial).replace('.', ',') : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objetivoEur = parsearEuros(texto);
  const valido = objetivoEur === null || !Number.isNaN(objetivoEur);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError('Escribe una cantidad en euros.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(objetivoEur);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar el objetivo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    // La tarjeta de detras abre este formulario al tocarla: los toques aqui no deben llegarle.
    <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Cuentas corrientes, remuneradas, de ahorro y fondos monetarios. Ahora tienes{' '}
        <span className="font-mono text-fg">{eur(valor)}</span>.
      </p>
      <Input
        label="Objetivo (€)"
        inputMode="decimal"
        placeholder="Sin objetivo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="font-mono"
      />
      {objetivoEur !== null && valido && objetivoEur > 0 && (
        <p className="notice">
          <span>
            {valor >= objetivoEur ? (
              <>
                Fondo completo: tienes <span className="font-mono text-fg">{eur(valor - objetivoEur)}</span> por encima del
                objetivo.
              </>
            ) : (
              <>
                Te faltan <span className="font-mono text-fg">{eur(objetivoEur - valor)}</span> para completarlo.
              </>
            )}
          </span>
        </p>
      )}
      <FormError>{error}</FormError>
      <FormActions onCancel={onCancel} guardando={guardando} />
    </form>
  );
}
