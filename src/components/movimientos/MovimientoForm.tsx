import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { ImporteKeypadInput } from '../ui/ImporteKeypadInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { CategoriaSelect } from './CategoriaSelect';
import { SubcategoriaSelect } from './SubcategoriaSelect';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { useProfiles } from '../../hooks/useProfiles';
import { useAnclasPeriodo } from '../../hooks/useAnclasPeriodo';
import { useAuth } from '../../lib/auth/useAuth';
import { avisoCierreCorto, type AvisoCierreCorto } from '../../lib/finance/periodos';
import { IconoSubcategoria } from '../icons/IconoTaxonomia';
import { IconChevronRight, IconInfo } from '../icons/UiIcons';
import { Segmented } from '../ui/Segmented';
import { Cargando } from '../ui/Spinner';
import { FormActions, FormError } from '../ui/FormActions';
import { ETIQUETA_TIPO, precioActualUnitarioEfectivo } from '../../lib/finance/patrimonio';
import { formatearImporte } from '../../lib/finance/formato';
import type { Movimiento, PosicionPatrimonio, Visibilidad } from '../../lib/supabase/database.types';

export interface MovimientoFormValues {
  nombre: string;
  fecha: string; // datetime-local
  importe: number; // con signo
  subcategoria_id: number;
  usuario_id: string;
  visibilidad: Visibilidad;
  nota: string;
  esPrimerDiaMes: boolean;
  // Solo en movimientos de Ahorro dados de alta (no al editar): cuenta de Patrimonio a la que va
  // (gasto: se le suma) o de la que sale (ingreso: se le resta) el dinero. null = ninguna.
  cuentaPatrimonioId: string | null;
}

interface MovimientoFormProps {
  initialValues?: Partial<Movimiento>;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
  onCancel: () => void;
  // Cuentas (corriente, remunerada, de ahorro) entre las que elegir en un movimiento de Ahorro.
  // Sin esta prop (p.ej. al editar) no se muestra el selector.
  cuentasAhorro?: PosicionPatrimonio[];
}

const SIN_CUENTA = 'ninguna';

function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MovimientoForm({ initialValues, onSubmit, onCancel, cuentasAhorro }: MovimientoFormProps) {
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
  const [esPrimerDiaMes, setEsPrimerDiaMes] = useState(initialValues?.es_primer_dia_mes ?? false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarMas, setMostrarMas] = useState(false);
  const [cuentaId, setCuentaId] = useState('');
  const [valoresPendientes, setValoresPendientes] = useState<MovimientoFormValues | null>(null);
  const [confirmacionCierre, setConfirmacionCierre] = useState<AvisoCierreCorto | null>(null);

  // Anclas del usuario AL QUE se atribuye el movimiento (no necesariamente quien esta
  // escribiendo): cada usuario tiene su propio calendario de "mes" personal.
  const { anclas } = useAnclasPeriodo(usuarioId || undefined);

  const subcategorias = categoriaId !== null ? subcategoriasDe(categoriaId) : [];
  const subcategoriaSeleccionada = todasLasSubcategorias.find((s) => s.id === subcategoriaId);
  const elegirCuenta = !!subcategoriaSeleccionada?.es_ahorro && !!cuentasAhorro && cuentasAhorro.length > 0;

  // Al pasar a Ahorro, propone la primera cuenta (las de ahorro van primero, ver AppShell); si ya
  // habia una elegida y sigue existiendo, se respeta.
  useEffect(() => {
    if (!elegirCuenta || !cuentasAhorro) return;
    if (cuentaId !== SIN_CUENTA && !cuentasAhorro.some((c) => c.id === cuentaId)) setCuentaId(cuentasAhorro[0].id);
  }, [elegirCuenta, cuentasAhorro, cuentaId]);

  // Al editar un movimiento existente, deriva la categoria a partir de su subcategoria
  // en cuanto la taxonomia termina de cargar (solo tenemos subcategoria_id guardado).
  useEffect(() => {
    if (categoriaId !== null || !subInicial || todasLasSubcategorias.length === 0) return;
    const sub = todasLasSubcategorias.find((s) => s.id === subInicial);
    if (sub) setCategoriaId(sub.categoria_id);
  }, [subInicial, todasLasSubcategorias, categoriaId]);

  // La casilla "primer dia del mes" solo tiene sentido en Salario: si se cambia a otra
  // subcategoria, se desmarca para no dejar una marca fantasma en un movimiento que ya no la
  // muestra. Se espera a que la taxonomia termine de cargar (igual que el efecto de arriba):
  // si no, en la primera pasada `todasLasSubcategorias` esta vacia, no encuentra "Salario" y
  // desmarcaba la casilla aunque el movimiento editado sí la tuviera activada.
  useEffect(() => {
    if (todasLasSubcategorias.length === 0) return;
    const esSalario = todasLasSubcategorias.find((s) => s.id === subcategoriaId)?.nombre === 'Salario';
    if (!esSalario) setEsPrimerDiaMes(false);
  }, [subcategoriaId, todasLasSubcategorias]);

  async function guardar(values: MovimientoFormValues) {
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

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

    const values: MovimientoFormValues = {
      nombre,
      fecha: new Date(fecha).toISOString(),
      importe: esGasto ? -Math.abs(magnitud) : Math.abs(magnitud),
      subcategoria_id: subcategoriaId,
      usuario_id: usuarioId,
      visibilidad,
      nota,
      esPrimerDiaMes,
      cuentaPatrimonioId: elegirCuenta && cuentaId && cuentaId !== SIN_CUENTA ? cuentaId : null,
    };

    if (esPrimerDiaMes) {
      const aviso = avisoCierreCorto(anclas, new Date(values.fecha));
      if (aviso) {
        setValoresPendientes(values);
        setConfirmacionCierre(aviso);
        return;
      }
    }

    await guardar(values);
  }

  async function confirmarCierre() {
    setConfirmacionCierre(null);
    if (valoresPendientes) {
      const values = valoresPendientes;
      setValoresPendientes(null);
      await guardar(values);
    }
  }

  function cancelarCierre() {
    setConfirmacionCierre(null);
    setValoresPendientes(null);
  }

  const etiquetaMesCierre = confirmacionCierre
    ? new Date(confirmacionCierre.etiqueta.year, confirmacionCierre.etiqueta.month, 1).toLocaleDateString('es-ES', {
        month: 'long',
        year: '2-digit',
      })
    : '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Segmented
        full
        ariaLabel="Tipo de movimiento"
        value={esGasto ? 'gasto' : 'ingreso'}
        onChange={(v) => setEsGasto(v === 'gasto')}
        options={[
          { value: 'gasto', label: 'Gasto', tone: 'bad' },
          { value: 'ingreso', label: 'Ingreso', tone: 'ok' },
        ]}
      />

      <ImporteKeypadInput
        label="Importe"
        value={magnitud}
        onChange={setMagnitud}
        colorClassName={esGasto ? 'text-bad' : 'text-ok'}
      />

      {loadingTaxonomia ? (
        <Cargando texto="Cargando categorías..." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <CategoriaSelect categorias={categorias} value={categoriaId} onChange={(id) => { setCategoriaId(id); setSubcategoriaId(null); }} />
          <SubcategoriaSelect subcategorias={subcategorias} value={subcategoriaId} onChange={setSubcategoriaId} />
        </div>
      )}

      {/* El nombre va despues de categoria/subcategoria a proposito: abrir un <select> justo
          tras escribir en un campo de texto deja el teclado de iOS animandose fuera todavia,
          y el desplegable nativo se renderiza con el viewport reducido (se ve "cortado" aunque
          se puede hacer scroll dentro). Con un select justo antes, no hay teclado que cerrar. */}
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Cena viernes" />

      {subcategoriaSeleccionada?.es_traspaso && (
        <p className="notice">
          <IconInfo />
          <span>
            Un movimiento en{' '}
            <span className="inline-flex items-center gap-1 align-text-bottom text-fg">
              <IconoSubcategoria nombre={subcategoriaSeleccionada.nombre} className="w-3.5 h-3.5" />
              {subcategoriaSeleccionada.nombre}
            </span>{' '}
            es un traspaso a otra cuenta tuya, no dinero perdido:
            aunque salga en rojo del balance, sigue siendo tuyo, solo que guardado en otro sitio.
          </span>
        </p>
      )}

      {elegirCuenta && cuentasAhorro && (
        <div className="flex flex-col gap-1.5">
          <Select
            label={esGasto ? 'Cuenta a la que va el ahorro' : 'Cuenta de la que sale el dinero'}
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
          >
            {cuentasAhorro.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {ETIQUETA_TIPO[c.tipo]} ({formatearImporte(precioActualUnitarioEfectivo(c, new Date()))} €)
              </option>
            ))}
            <option value={SIN_CUENTA}>Ninguna (no tocar Patrimonio)</option>
          </Select>
          {cuentaId !== SIN_CUENTA && (
            <span className="text-xs text-muted">
              {esGasto ? 'Se sumará' : 'Se restará'} el importe al saldo de esta cuenta en Patrimonio.
            </span>
          )}
        </div>
      )}

      {subcategoriaSeleccionada?.nombre === 'Salario' && (
        <label className="field-group !flex-row items-center justify-between gap-3 text-sm cursor-pointer">
          Hacer primer día del mes
          <input
            type="checkbox"
            checked={esPrimerDiaMes}
            onChange={(e) => setEsPrimerDiaMes(e.target.checked)}
            className="switch"
          />
        </label>
      )}

      <Input label="Fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

      <div>
        <button
          type="button"
          onClick={() => setMostrarMas((v) => !v)}
          aria-expanded={mostrarMas}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"
        >
          <IconChevronRight className={`w-4 h-4 transition-transform ${mostrarMas ? 'rotate-90 text-cyan' : ''}`} />
          Usuario, privacidad y nota
        </button>

        {mostrarMas && (
          <div className="flex flex-col gap-4 mt-3">
            <div className="grid grid-cols-2 gap-2">
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
            </div>

            <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        )}
      </div>

      <FormError>{error}</FormError>

      <FormActions onCancel={onCancel} guardando={guardando} />

      <Modal open={confirmacionCierre !== null} onClose={cancelarCierre} title="Confirmar cierre de mes" centrado>
        <p className="text-sm text-muted leading-relaxed mb-5">
          Vas a cerrar el mes <span className="text-fg font-medium">{etiquetaMesCierre}</span> con{' '}
          <span className="font-mono text-fg">{confirmacionCierre?.dias}</span> días. ¿Quieres proceder a cerrarlo?
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={cancelarCierre}>
            No
          </Button>
          <Button type="button" className="flex-1" onClick={confirmarCierre} disabled={guardando}>
            Sí
          </Button>
        </div>
      </Modal>
    </form>
  );
}
