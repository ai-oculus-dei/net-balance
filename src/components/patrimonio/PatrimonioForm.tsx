import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { AjustarCuentaForm } from './AjustarCuentaForm';
import { useAuth } from '../../lib/auth/useAuth';
import { toIsoDate } from '../../lib/finance/fechas';
import { formatearImporte } from '../../lib/finance/formato';
import {
  agruparPorActivo,
  claveActivo,
  claveCuenta,
  esCuentaGastos,
  ETIQUETA_GRUPO,
  ETIQUETA_TIPO,
  esTipoPorUnidad,
  precioActualUnitarioEfectivo,
  precioCompraTotal,
  TIPOS_POR_GRUPO,
  totalDesdeUnitario,
  unitarioDesdeTotal,
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
  // Id del lote (cuenta de un unico lote) del que se descuenta el coste de esta compra, o null
  // si no se financia con ninguna cuenta trackeada. No es una columna de posiciones_patrimonio:
  // el llamante lo separa antes de insertar (ver crearPosicionFinanciada).
  cuentaOrigenId: string | null;
}

interface PatrimonioFormProps {
  initialValues?: Partial<PosicionPatrimonio>;
  // Resto de posiciones activas del usuario, para detectar si el ticker+mercado que se esta
  // escribiendo ya corresponde a un activo existente (mismas compras agrupadas, ver
  // agruparPorActivo en lib/finance/patrimonio.ts) y heredar su nombre.
  posicionesExistentes?: PosicionPatrimonio[];
  onSubmit: (values: PatrimonioFormValues) => Promise<void>;
  // Hace crecer una cuenta "de saldo" ya existente en vez de dar de alta una posicion nueva — ver
  // ajustarCuenta en lib/finance/ventas.ts. Solo se usa al crear (ver cuentaSeleccionada).
  onAjustarCuenta: (posicionId: string, importe: number, fecha: string) => Promise<void>;
  onCancel: () => void;
}

type ModoEntrada = 'total' | 'unitario';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

export function PatrimonioForm({
  initialValues,
  posicionesExistentes = [],
  onSubmit,
  onAjustarCuenta,
  onCancel,
}: PatrimonioFormProps) {
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
  // Si la posicion todavia tenia una TAE fijada de antes (el formulario ya no la ofrece, ver
  // handleSubmit), se parte del valor EFECTIVO a hoy (principal + interes acumulado) en vez de
  // `precio_actual_unitario` (que para esas posiciones esta a null) — si no, guardar sin tocar
  // este campo la resetearia a 0 en vez de conservar el valor real acumulado.
  const [precioActualInput, setPrecioActualInput] = useState(() =>
    initialValues?.tae != null && initialValues.precio_compra_unitario != null && initialValues.fecha_compra
      ? precioActualUnitarioEfectivo({
          precio_compra_unitario: initialValues.precio_compra_unitario,
          precio_actual_unitario: initialValues.precio_actual_unitario ?? null,
          fecha_compra: initialValues.fecha_compra,
          tae: initialValues.tae,
        })
      : (initialValues?.precio_actual_unitario ?? 0)
  );
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(''); // id de la cuenta existente elegida, o '' = "Nueva"
  const [cuentaOrigenId, setCuentaOrigenId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Financiar con una cuenta" y "elegir cuenta existente" solo se ofrecen al crear, nunca al
  // editar una posicion ya dada de alta (ver cuentasOrigenElegibles/cuentasExistentes).
  const esCreacion = !initialValues;

  const unitario = esTipoPorUnidad(tipo);
  const otrasPosiciones = posicionesExistentes.filter((p) => p.id !== initialValues?.id);
  // Con ticker puesto, el precio de cualquier tipo "por unidad" lo mantiene solo la Edge
  // Function (Yahoo Finance/CoinGecko) cada hora — incluido Commodity: aunque el simbolo "de
  // materia prima" no lo cubre Yahoo con ese formato, un ETC/ETF que replique su precio si puede
  // estar cubierto. No tiene sentido dejar editar el precio a mano: se sobrescribiria en la
  // siguiente ejecucion de todas formas.
  const precioAutomatico = unitario && ticker.trim() !== '';

  // Al pasar a un tipo "de saldo" (sin unidades: cuentas, fondo monetario), fija cantidad=1 y
  // fuerza el modo de entrada a "total" — el toggle no tiene sentido si cantidad siempre es 1.
  useEffect(() => {
    if (!unitario) {
      setCantidad(1);
      setModoCompra('total');
      setModoActual('total');
    }
  }, [unitario]);

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
  // ofrece elegir una cuenta ya existente (mismo tipo+nombre) en vez de dar de alta una sin
  // relacion con el mismo nombre por casualidad — elegir una existente ya no crea una posicion
  // nueva agrupada visualmente (ver mostrarAjusteCuenta mas abajo), hace crecer esa misma cuenta.
  // Solo al crear: no tiene sentido "cambiar de cuenta" una posicion que ya existe, al editarla.
  const cuentasExistentes: { id: string; nombre: string }[] = [];
  if (esCreacion) {
    const representantePorClave = new Map<string, PosicionPatrimonio>();
    for (const p of otrasPosiciones) {
      if (p.tipo !== tipo || p.ticker) continue;
      const clave = claveCuenta(p.tipo, p.nombre);
      const actual = representantePorClave.get(clave);
      if (!actual || p.fecha_compra < actual.fecha_compra) representantePorClave.set(clave, p);
    }
    for (const p of representantePorClave.values()) cuentasExistentes.push({ id: p.id, nombre: p.nombre });
  }

  // Al cambiar de tipo, la cuenta elegida (si la habia) pertenecia al tipo anterior: se resetea.
  useEffect(() => {
    setCuentaSeleccionada('');
  }, [tipo]);

  // Cuentas que se pueden elegir para financiar esta compra: solo al crear (nunca al editar), y
  // solo cuentas de un unico lote — retirar de una con varias aportaciones es ambiguo (¿de cual
  // se descuenta?) y se deja fuera de esta primera version, se ajusta a mano. La cuenta "Gastos"
  // tampoco se ofrece: se resincroniza sola con el balance neto del mes (useSincronizarCuentaGastos)
  // y cualquier retirada manual se deshace en cuanto vuelva a sincronizarse.
  const cuentasOrigenElegibles = esCreacion
    ? agruparPorActivo(otrasPosiciones).filter((a) => !esTipoPorUnidad(a.tipo) && a.lotes.length === 1 && !esCuentaGastos(a))
    : [];

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
    const precioCompraUnitarioFinal =
      modoCompra === 'total' ? unitarioDesdeTotal(precioCompraInput, cantidad) : precioCompraInput;
    if (cuentaOrigenId) {
      const cuentaElegida = cuentasOrigenElegibles.find((a) => a.lotes[0].id === cuentaOrigenId);
      const costeCompra = precioCompraTotal({ cantidad: unitario ? cantidad : 1, precio_compra_unitario: precioCompraUnitarioFinal });
      if (!cuentaElegida || costeCompra > cuentaElegida.valorActualTotal + 0.005) {
        setError('Saldo insuficiente en la cuenta elegida para financiar esta compra.');
        return;
      }
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
        precio_compra_unitario: precioCompraUnitarioFinal,
        precio_actual_unitario:
          modoActual === 'total' ? unitarioDesdeTotal(precioActualInput, cantidad) : precioActualInput,
        // El formulario ya no ofrece fijar una TAE (las cuentas se tratan como saldo que crece a
        // mano, ver ajustarCuenta) — una posicion antigua que todavia la tuviera la pierde en
        // cuanto se edite y se guarde desde aqui.
        tae: null,
        cuentaOrigenId: cuentaOrigenId || null,
        fecha_compra: fechaCompra,
        usuario_id: initialValues?.usuario_id ?? session!.user.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la posición.');
    } finally {
      setGuardando(false);
    }
  }

  const tipoYCuentaSelectores = (
    <>
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

      {esCreacion && !unitario && cuentasExistentes.length > 0 && (
        <Select label="Cuenta" value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}>
          <option value="">Nueva</option>
          {cuentasExistentes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      )}
    </>
  );

  // Cuenta "de saldo" ya existente elegida: en vez de dar de alta una posicion nueva, el
  // formulario se reduce a "cuanto se añade y cuando" y hace crecer esa misma cuenta.
  if (esCreacion && !unitario && cuentaSeleccionada) {
    return (
      <div className="flex flex-col gap-4">
        {tipoYCuentaSelectores}
        <AjustarCuentaForm
          etiquetaImporte="Importe a añadir"
          onSubmit={(importe, fecha) => onAjustarCuenta(cuentaSeleccionada, importe, fecha)}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {tipoYCuentaSelectores}

      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        placeholder="Apple Inc."
        disabled={activoExistente !== null}
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
          <span className="text-sm text-[var(--color-text-muted)]">{unitario ? 'Precio de compra' : 'Importe'}</span>
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

      {precioAutomatico ? null : (
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

      {esCreacion && cuentasOrigenElegibles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Select label="Financiar con una cuenta" value={cuentaOrigenId} onChange={(e) => setCuentaOrigenId(e.target.value)}>
            <option value="">Ninguna (dinero externo)</option>
            {cuentasOrigenElegibles.map((a) => (
              <option key={a.lotes[0].id} value={a.lotes[0].id}>
                {a.nombre} ({formatearImporte(a.valorActualTotal)} €)
              </option>
            ))}
          </Select>
          <p className="text-xs text-[var(--color-text-muted)]">
            Al guardar, el coste de esta compra se descontará del saldo de esa cuenta.
          </p>
        </div>
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
