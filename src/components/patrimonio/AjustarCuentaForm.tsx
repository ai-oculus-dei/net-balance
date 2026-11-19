import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { FormActions, FormError } from '../ui/FormActions';
import { toIsoDate } from '../../lib/finance/fechas';

interface AjustarCuentaFormProps {
  etiquetaImporte: string; // "Importe a añadir" | "Importe a restar"
  onSubmit: (importe: number, fecha: string) => Promise<void>;
  onCancel: () => void;
}

// Formulario minimo (importe + fecha) para hacer crecer o reducir una cuenta "de saldo" ya
// existente — usado tanto desde PatrimonioForm (al elegir una cuenta existente) como desde el
// boton "Reducir" de ActivoCard. La cuenta en si ya se conoce en el llamante.
export function AjustarCuentaForm({ etiquetaImporte, onSubmit, onCancel }: AjustarCuentaFormProps) {
  const [importe, setImporte] = useState(0);
  const [fecha, setFecha] = useState(toIsoDate(new Date()));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (importe <= 0) {
      setError('Introduce un importe.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(importe, fecha);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el ajuste.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImporteKeypadInput label={etiquetaImporte} value={importe} onChange={setImporte} decimales={2} sufijo=" €" />
      <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      <FormError>{error}</FormError>

      <FormActions onCancel={onCancel} guardando={guardando} />
    </form>
  );
}
