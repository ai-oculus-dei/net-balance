import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/auth/useAuth';
import { toIsoDate } from '../../lib/finance/fechas';
import { formatearImporte } from '../../lib/finance/formato';
import {
  claveActivo,
  claveCuenta,
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
import type { MonedaPosicion, PosicionPatrimonio, TipoPosicionPatrimonio } from '../../lib/supabase/database.types';

export interface PatrimonioFormValues {
  tipo: TipoPosicionPatrimonio;
  nombre: string;
  ticker: string | null;
  mercado: string | null;
  moneda: MonedaPosicion;
  cantidad: number;
  precio_compra_unitario: number;
  precio_actual_unitario: number | null;
  tae: number | null;
  fecha_compra: string;
  usuario_id: string;
}

interface PatrimonioFormProps {
  initialValues?: Partial<PosicionPatrimonio>;
  // Resto de posiciones activas del usuario, para detectar si el ticker+mercado que se esta
  // escribiendo ya corresponde a un activo existente (mismas compras agrupadas, ver
  // agruparPorActivo en lib/finance/patrimonio.ts) y heredar su nombre.
  posicionesExistentes?: PosicionPatrimonio[];
  onSubmit: (values: PatrimonioFormValues) => Promise<void>;
  onCancel: () => void;
}

type ModoEntrada = 'total' | 'unitario';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

export function PatrimonioForm({ initialValues, posicionesExistentes = [], onSubmit, onCancel }: PatrimonioFormProps) {
  const { session } = useAuth();

  const [tipo, setTipo] = useState<TipoPosicionPatrimonio>(initialValues?.tipo ?? 'stock');
  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [ticker, setTicker] = useState(initialValues?.ticker ?? '');
  const [mercado, setMercado] = useState(initialValues?.mercado ?? '');
  const [moneda, setMoneda] = useState<MonedaPosicion>(initialValues?.moneda ?? 'EUR');
  // Sin valor por defecto al crear una posicion nueva: que el campo salga vacio (0 -> el
  // keypad no muestra nada) en vez de un "1" que invita a dejarlo sin revisar.
  const [cantidad, setCantidad] = useState(initialValues?.cantidad ?? 0);
  const [fechaCompra, setFechaCompra] = useState(initialValues?.fecha_compra ?? toIsoDate(new Date()));
  const [modoCompra, setModoCompra] = useState<ModoEntrada>('unitario');
  const [modoActual, setModoActual] = useState<ModoEntrada>('unitario');
  const [precioCompraInput, setPrecioCompraInput] = useState(initialValues?.precio_compra_unitario ?? 0);
  const [precioActualInput, setPrecioActualInput] = useState(initialValues?.precio_actual_unitario ?? 0);
  const [usarTae, setUsarTae] = useState(initialValues?.tae != null);
  const [tae, setTae] = useState(initialValues?.tae ?? 0);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitario = esTipoPorUnidad(tipo);
  const puedeUsarTae = esTipoConTae(tipo);
  const otrasPosiciones = posicionesExistentes.filter((p) => p.id !== initialValues?.id);
  // Con ticker puesto, el precio de cualquier tipo "por unidad" lo mantiene solo la Edge
  // Function (Yahoo Finance/CoinGecko) cada hora — incluido Commodity: aunque el simbolo "de
  // materia prima" no lo cubre Yahoo con ese formato, un ETC/ETF que replique su precio si puede
  // estar cubierto. No tiene sentido dejar editar el precio a mano: se sobrescribiria en la
  // siguiente ejecucion de todas formas.
  const precioAutomatico = unitario && ticker.trim() !== '' && !usarTae;

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

  // CoinGecko ya da el precio directamente en EUR (vs_currencies=eur): la divisa del ticker
  // solo aplica a Yahoo Finance, no tiene sentido para Criptomoneda.
  useEffect(() => {
    if (tipo === 'criptomoneda') setMoneda('EUR');
  }, [tipo]);

  // Mismo ticker+mercado que otra posicion ya existente (de otra compra distinta, o del mismo
  // activo): se trata como el mismo activo (ver claveActivo/agruparPorActivo) y hereda el
  // nombre de la compra mas antigua de ese grupo, en vez de dejar dos nombres distintos para el
  // mismo activo.
  const claveNueva = claveActivo(ticker, mercado);
  const coincidencias = claveNueva
    ? otrasPosiciones.filter((p) => claveActivo(p.ticker, p.mercado) === claveNueva)
    : [];
  const activoExistente =
    coincidencias.length > 0 ? [...coincidencias].sort((a, b) => a.fecha_compra.localeCompare(b.fecha_compra))[0] : null;

  useEffect(() => {
    if (activoExistente) setNombre(activoExistente.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activoExistente?.id, activoExistente?.nombre]);

  // Para los tipos "de saldo" (sin ticker: cuentas, fondo monetario...), el desplegable "Cuenta"
  // ofrece sumar una aportacion nueva a una cuenta ya existente (mismo tipo+nombre) en vez de dar
  // de alta una posicion sin relacion con el mismo nombre por casualidad.
  const cuentasExistentes: string[] = [];
  const clavesVistas = new Set<string>();
  for (const p of otrasPosiciones) {
    if (p.tipo !== tipo || p.ticker) continue;
    const clave = claveCuenta(p.tipo, p.nombre);
    if (!clavesVistas.has(clave)) {
      clavesVistas.add(clave);
      cuentasExistentes.push(p.nombre);
    }
  }

  // Al cambiar de tipo, la cuenta elegida (si la habia) pertenecia al tipo anterior: se resetea.
  useEffect(() => {
    setCuentaSeleccionada('');
  }, [tipo]);

  useEffect(() => {
    if (cuentaSeleccionada) setNombre(cuentaSeleccionada);
  }, [cuentaSeleccionada]);

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
        moneda,
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

      {!unitario && cuentasExistentes.length > 0 && (
        <Select label="Cuenta" value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}>
          <option value="">Nueva</option>
          {cuentasExistentes.map((nombreCuenta) => (
            <option key={nombreCuenta} value={nombreCuenta}>
              {nombreCuenta}
            </option>
          ))}
        </Select>
      )}

      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        placeholder="Apple Inc."
        disabled={activoExistente !== null || cuentaSeleccionada !== ''}
      />

      {unitario && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={tipo === 'criptomoneda' ? 'bitcoin' : 'AF.PA'}
            />
            <Input
              label="Mercado"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              placeholder="Euronext"
              disabled={tipo === 'criptomoneda'}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {tipo === 'criptomoneda'
              ? 'Usa el ID de CoinGecko, no el símbolo (p. ej. "bitcoin", no "BTC") — así se actualiza el precio solo.'
              : 'Escribe el ticker exactamente como aparece en Yahoo Finance, con el sufijo de mercado incluido (p. ej. "AF.PA", "NUKL.DE"; sin sufijo para NASDAQ/NYSE) — así se actualiza el precio solo. Mercado es solo de referencia, ya no hace falta para buscar el precio.'}
          </p>
          {tipo !== 'criptomoneda' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">Divisa del ticker</span>
                <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMoneda('EUR')}
                    className={`px-2.5 py-1 ${moneda === 'EUR' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    EUR
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoneda('USD')}
                    className={`px-2.5 py-1 ${moneda === 'USD' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    USD
                  </button>
                </div>
              </div>
              {moneda === 'USD' && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  El precio del ticker se pide en dólares y se convierte a euros automáticamente con el tipo de
                  cambio EUR/USD del momento.
                </p>
              )}
            </div>
          )}
          {activoExistente && (
            <p className="text-xs text-[var(--color-accent)]">
              Este activo ya existe en el patrimonio, se heredará el nombre de la primera compra
            </p>
          )}
        </div>
      )}

      {unitario && <ImporteKeypadInput label="Cantidad" value={cantidad} onChange={setCantidad} decimales={8} />}

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
        <ImporteKeypadInput
          label=""
          value={precioCompraInput}
          onChange={setPrecioCompraInput}
          decimales={2}
          sufijo=" €"
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
          <ImporteKeypadInput label="TAE (%)" value={tae} onChange={setTae} decimales={2} />
          {valorActualConTaePreview !== null && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Valor actual calculado: {formatearImporte(valorActualConTaePreview)} €
            </p>
          )}
        </div>
      ) : precioAutomatico ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-[var(--color-text-muted)]">Precio actual</span>
          <p
            className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 font-mono text-lg ${
              initialValues?.error_precio ? 'text-[var(--color-loss)]' : 'text-[var(--color-text)]'
            }`}
          >
            {initialValues?.error_precio ? '-' : `${formatearImporte(precioActualInput)} €`}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {initialValues?.error_precio
              ? `No se ha podido actualizar el precio: ${initialValues.error_precio}`
              : 'Se actualiza solo con el precio de mercado (Yahoo Finance/CoinGecko) cada hora — no se puede editar a mano mientras tenga ticker.'}
          </p>
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
          <ImporteKeypadInput label="" value={precioActualInput} onChange={setPrecioActualInput} decimales={2} />
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
