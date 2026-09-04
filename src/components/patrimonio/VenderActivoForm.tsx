import { useMemo, useState, type FormEvent } from 'react';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { claseColorPorSigno } from '../charts/colors';
import { agruparPorActivo, esCuentaGastos, esTipoPorUnidad, type ActivoAgrupado } from '../../lib/finance/patrimonio';
import { calcularVentaFIFO } from '../../lib/finance/ventas';
import { formatearCantidad, formatearImporte } from '../../lib/finance/formato';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface VenderActivoFormProps {
  activo: ActivoAgrupado;
  // Resto de posiciones activas del usuario, para ofrecer una cuenta destino a la que abonar el
  // importe recibido (sin restriccion de un unico lote: abonar solo inserta un lote nuevo, nunca
  // toca los existentes — a diferencia de "Financiar con una cuenta" en PatrimonioForm).
  posicionesExistentes: PosicionPatrimonio[];
  onSubmit: (cantidadVendida: number, precioVentaUnitario: number, cuentaDestinoId: string | null) => Promise<void>;
  onCancel: () => void;
}

export function VenderActivoForm({ activo, posicionesExistentes, onSubmit, onCancel }: VenderActivoFormProps) {
  const precioActualUnitario = activo.cantidadTotal > 0 ? activo.valorActualTotal / activo.cantidadTotal : 0;

  const [cantidad, setCantidad] = useState(activo.cantidadTotal);
  const [precioVenta, setPrecioVenta] = useState(precioActualUnitario);
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La cuenta "Gastos" no se ofrece como destino: se resincroniza sola con el balance neto del
  // mes (useSincronizarCuentaGastos) y un abono manual ahi se deshace en cuanto vuelva a
  // sincronizarse.
  const cuentasDestino = useMemo(
    () => agruparPorActivo(posicionesExistentes).filter((a) => !esTipoPorUnidad(a.tipo) && !esCuentaGastos(a)),
    [posicionesExistentes]
  );

  const previsualizacion = useMemo(() => {
    if (cantidad <= 0 || cantidad > activo.cantidadTotal) return null;
    try {
      return calcularVentaFIFO(activo.lotes, cantidad, precioVenta);
    } catch {
      return null;
    }
  }, [activo.lotes, activo.cantidadTotal, cantidad, precioVenta]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (cantidad <= 0 || cantidad > activo.cantidadTotal) {
      setError(`Introduce una cantidad entre 0 y ${formatearCantidad(activo.cantidadTotal)}.`);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(cantidad, precioVenta, cuentaDestinoId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Disponible: {formatearCantidad(activo.cantidadTotal)} {activo.ticker ?? activo.nombre}
      </p>

      <ImporteKeypadInput label="Cantidad a vender" value={cantidad} onChange={setCantidad} decimales={8} />
      <ImporteKeypadInput label="Precio de venta" value={precioVenta} onChange={setPrecioVenta} decimales={2} sufijo=" €" />

      {cuentasDestino.length > 0 && (
        <Select label="Abonar en una cuenta" value={cuentaDestinoId} onChange={(e) => setCuentaDestinoId(e.target.value)}>
          <option value="">Ninguna (dinero externo)</option>
          {cuentasDestino.map((a) => (
            <option key={a.lotes[0].id} value={a.lotes[0].id}>
              {a.nombre}
            </option>
          ))}
        </Select>
      )}

      {previsualizacion && (
        <div className="flex flex-col gap-1 text-sm border border-[var(--color-border)] rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Importe a recibir</span>
            <span className="font-mono font-semibold">{formatearImporte(previsualizacion.importeRecibido)} €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Coste base</span>
            <span className="font-mono font-semibold">{formatearImporte(previsualizacion.costeBaseTotal)} €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Ganancia realizada</span>
            <span className={`font-mono font-semibold ${claseColorPorSigno(previsualizacion.gananciaRealizada)}`}>
              {previsualizacion.gananciaRealizada > 0 ? '+' : ''}
              {formatearImporte(previsualizacion.gananciaRealizada)} €
              {previsualizacion.gananciaRealizadaPct !== null
                ? ` (${previsualizacion.gananciaRealizadaPct > 0 ? '+' : ''}${formatearImporte(previsualizacion.gananciaRealizadaPct, 1)}%)`
                : ''}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-loss)]">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={guardando}>
          {guardando ? 'Vendiendo...' : 'Vender'}
        </Button>
      </div>
    </form>
  );
}
