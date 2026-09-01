import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/auth/useAuth';
import { toIsoDate } from '../../lib/finance/fechas';
import {
  ETIQUETA_GRUPO,
  ETIQUETA_TIPO,
  esTipoConTae,
  esTipoPorUnidad,
  TIPOS_POR_GRUPO,
  totalDesdeUnitario,
  unitarioDesdeTotal,
  valorConTae,
  type GrupoPatrimonio,
} from '../../lib/finance/patrimonio';
import type { PosicionPatrimonio, TipoPosicionPatrimonio } from '../../lib/supabase/database.types';

export interface PatrimonioFormValues {
  tipo: TipoPosicionPatrimonio;
  nombre: string;
  ticker: string | null;
  mercado: string | null;
  cantidad: number;
  precio_compra_unitario: number;
  precio_actual_unitario: number | null;
  tae: number | null;
  fecha_compra: string;
  usuario_id: string;
}

interface PatrimonioFormProps {
  initialValues?: Partial<PosicionPatrimonio>;
  onSubmit: (values: PatrimonioFormValues) => Promise<void>;
  onCancel: () => void;
}

type ModoEntrada = 'total' | 'unitario';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

export function PatrimonioForm({ initialValues, onSubmit, onCancel }: PatrimonioFormProps) {
  const { session } = useAuth();

  const [tipo, setTipo] = useState<TipoPosicionPatrimonio>(initialValues?.tipo ?? 'stock');
  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [ticker, setTicker] = useState(initialValues?.ticker ?? '');
  const [mercado, setMercado] = useState(initialValues?.mercado ?? '');
  const [cantidad, setCantidad] = useState(initialValues?.cantidad ?? 1);
  const [fechaCompra, setFechaCompra] = useState(initialValues?.fecha_compra ?? toIsoDate(new Date()));
  const [modoCompra, setModoCompra] = useState<ModoEntrada>('unitario');
  const [modoActual, setModoActual] = useState<ModoEntrada>('unitario');
  const [precioCompraInput, setPrecioCompraInput] = useState(initialValues?.precio_compra_unitario ?? 0);
  const [precioActualInput, setPrecioActualInput] = useState(initialValues?.precio_actual_unitario ?? 0);
  const [usarTae, setUsarTae] = useState(initialValues?.tae != null);
  const [tae, setTae] = useState(initialValues?.tae ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitario = esTipoPorUnidad(tipo);
  const puedeUsarTae = esTipoConTae(tipo);

  // Al pasar a un tipo "de saldo" (sin unidades: cuentas, fondo monetario), fija cantidad=1 y
  // fuerza el modo de entrada a "total" — el toggle no tiene sentido si cantidad siempre es 1.
  useEffect(() => {
    if (!unitario) {
      setCantidad(1);
      setModoCompra('total');
      setModoActual('total');
    }
  }, [unitario]);

  // Si se cambia a un tipo sin rentabilidad conocida, se desactiva el uso de TAE.
  useEffect(() => {
    if (!puedeUsarTae) setUsarTae(false);
  }, [puedeUsarTae]);

  const valorActualConTaePreview =
    usarTae && precioCompraInput > 0 ? valorConTae(precioCompraInput, tae, fechaCompra) : null;

  function cambiarModoCompra(nuevo: ModoEntrada) {
    if (nuevo === modoCompra) return;
    setPrecioCompraInput((actual) =>
      nuevo === 'total' ? totalDesdeUnitario(actual, cantidad) : unitarioDesdeTotal(actual, cantidad)
    );
    setModoCompra(nuevo);
  }

  function cambiarModoActual(nuevo: ModoEntrada) {
    if (nuevo === modoActual) return;
    setPrecioActualInput((actual) =>
      nuevo === 'total' ? totalDesdeUnitario(actual, cantidad) : unitarioDesdeTotal(actual, cantidad)
    );
    setModoActual(nuevo);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Introduce un nombre.');
      return;
    }
    if (unitario && cantidad <= 0) {
      setError('Introduce una cantidad.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        tipo,
        nombre,
        ticker: unitario && ticker ? ticker : null,
        mercado: unitario && mercado ? mercado : null,
        cantidad: unitario ? cantidad : 1,
        precio_compra_unitario:
          modoCompra === 'total' ? unitarioDesdeTotal(precioCompraInput, cantidad) : precioCompraInput,
        precio_actual_unitario:
          usarTae ? null : modoActual === 'total' ? unitarioDesdeTotal(precioActualInput, cantidad) : precioActualInput,
        tae: usarTae ? tae : null,
        fecha_compra: fechaCompra,
        usuario_id: initialValues?.usuario_id ?? session!.user.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la posición.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPosicionPatrimonio)}>
        {GRUPOS.map((grupo) => (
          <optgroup key={grupo} label={ETIQUETA_GRUPO[grupo]}>
            {TIPOS_POR_GRUPO[grupo].map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Apple Inc." />

      {unitario && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={tipo === 'criptomoneda' ? 'bitcoin' : 'AAPL'}
            />
            <Input
              label="Mercado"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              placeholder="NASDAQ"
              disabled={tipo === 'criptomoneda'}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {tipo === 'criptomoneda'
              ? 'Usa el ID de CoinGecko, no el símbolo (p. ej. "bitcoin", no "BTC") — así se actualiza el precio solo.'
              : 'Símbolo de Twelve Data (Mercado es opcional, solo para desambiguar si hace falta) — así se actualiza el precio solo.'}
          </p>
        </div>
      )}

      {unitario && (
        <Input
          label="Cantidad"
          type="text"
          inputMode="decimal"
          required
          value={cantidad || ''}
          onChange={(e) => setCantidad(Number(e.target.value.replace(',', '.')))}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-muted)]">Precio de compra</span>
          {unitario && (
            <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => cambiarModoCompra('total')}
                className={`px-2.5 py-1 ${modoCompra === 'total' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Total
              </button>
              <button
                type="button"
                onClick={() => cambiarModoCompra('unitario')}
                className={`px-2.5 py-1 ${modoCompra === 'unitario' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Por unidad
              </button>
            </div>
          )}
        </div>
        <Input
          type="text"
          inputMode="decimal"
          required
          value={precioCompraInput || ''}
          onChange={(e) => setPrecioCompraInput(Number(e.target.value.replace(',', '.')))}
        />
      </div>

      {puedeUsarTae && (
        <label className="flex items-center gap-2 text-sm border border-[var(--color-border)] rounded-md p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={usarTae}
            onChange={(e) => setUsarTae(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-accent)]"
          />
          Usar rentabilidad conocida (TAE) en vez de precio actual manual
        </label>
      )}

      {usarTae ? (
        <div className="flex flex-col gap-1.5">
          <Input
            label="TAE (%)"
            type="text"
            inputMode="decimal"
            required
            value={tae || ''}
            onChange={(e) => setTae(Number(e.target.value.replace(',', '.')))}
          />
          {valorActualConTaePreview !== null && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Valor actual calculado: {valorActualConTaePreview.toFixed(2)} €
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">Precio actual</span>
            {unitario && (
              <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => cambiarModoActual('total')}
                  className={`px-2.5 py-1 ${modoActual === 'total' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => cambiarModoActual('unitario')}
                  className={`px-2.5 py-1 ${modoActual === 'unitario' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  Por unidad
                </button>
              </div>
            )}
          </div>
          <Input
            type="text"
            inputMode="decimal"
            required
            value={precioActualInput || ''}
            onChange={(e) => setPrecioActualInput(Number(e.target.value.replace(',', '.')))}
          />
        </div>
      )}

      <Input
        label="Fecha de compra"
        type="date"
        value={fechaCompra}
        onChange={(e) => setFechaCompra(e.target.value)}
        required
      />

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
