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
import { useObjetivos } from '../../hooks/useObjetivos';
import { useAnclasPeriodo } from '../../hooks/useAnclasPeriodo';
import { useAuth } from '../../lib/auth/useAuth';
import { avisoCierreCorto, type AvisoCierreCorto } from '../../lib/finance/periodos';
import type { AportacionObjetivo, Movimiento, Visibilidad } from '../../lib/supabase/database.types';

export interface MovimientoFormValues {
  nombre: string;
  fecha: string; // datetime-local
  importe: number; // con signo
  subcategoria_id: number;
  usuario_id: string;
  visibilidad: Visibilidad;
  nota: string;
  esPrimerDiaMes: boolean;
  aportacion: { objetivoId: string; importe: number } | null;
}

interface MovimientoFormProps {
  initialValues?: Partial<Movimiento>;
  aportacionInicial?: AportacionObjetivo | null;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
  onCancel: () => void;
}

function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MovimientoForm({ initialValues, aportacionInicial, onSubmit, onCancel }: MovimientoFormProps) {
  const { session } = useAuth();
  const { categorias, subcategorias: todasLasSubcategorias, subcategoriasDe, loading: loadingTaxonomia } = useTaxonomia();
  const { profiles } = useProfiles();
  const { objetivos } = useObjetivos();

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
  const [objetivoDestino, setObjetivoDestino] = useState(aportacionInicial?.objetivo_id ?? '');
  const [importeAportacion, setImporteAportacion] = useState(aportacionInicial?.importe ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarMas, setMostrarMas] = useState(false);
  const [valoresPendientes, setValoresPendientes] = useState<MovimientoFormValues | null>(null);
  const [confirmacionCierre, setConfirmacionCierre] = useState<AvisoCierreCorto | null>(null);

  // Anclas del usuario AL QUE se atribuye el movimiento (no necesariamente quien esta
  // escribiendo): cada usuario tiene su propio calendario de "mes" personal.
  const { anclas } = useAnclasPeriodo(usuarioId || undefined);

  const subcategorias = categoriaId !== null ? subcategoriasDe(categoriaId) : [];
  const subcategoriaSeleccionada = todasLasSubcategorias.find((s) => s.id === subcategoriaId);

  const puedeAsignarAObjetivo =
    esGasto && subcategoriaSeleccionada?.es_ahorro === true && usuarioId === session?.user.id;
  const objetivosActivos = objetivos.filter((o) => o.activo);

  // Al editar un movimiento existente, deriva la categoria a partir de su subcategoria
  // en cuanto la taxonomia termina de cargar (solo tenemos subcategoria_id guardado).
  useEffect(() => {
    if (categoriaId !== null || !subInicial || todasLasSubcategorias.length === 0) return;
    const sub = todasLasSubcategorias.find((s) => s.id === subInicial);
    if (sub) setCategoriaId(sub.categoria_id);
  }, [subInicial, todasLasSubcategorias, categoriaId]);

  // Si el importe se reduce por debajo de lo ya asignado a un objetivo, ajusta la asignacion.
  useEffect(() => {
    setImporteAportacion((actual) => (actual > magnitud ? magnitud : actual));
  }, [magnitud]);

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

  function handleSeleccionarObjetivo(id: string) {
    setObjetivoDestino(id);
    if (id && importeAportacion <= 0) setImporteAportacion(magnitud);
    if (!id) setImporteAportacion(0);
  }

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
    if (puedeAsignarAObjetivo && objetivoDestino && importeAportacion <= 0) {
      setError('Introduce cuánto destinas al objetivo.');
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
      aportacion:
        puedeAsignarAObjetivo && objetivoDestino
          ? { objetivoId: objetivoDestino, importe: Math.min(importeAportacion, magnitud) }
          : null,
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
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={esGasto ? 'danger' : 'secondary'} onClick={() => setEsGasto(true)}>
          Gasto
        </Button>
        <Button
          type="button"
          variant={!esGasto ? 'primary' : 'secondary'}
          className={!esGasto ? 'bg-[var(--color-gain)] hover:opacity-90' : ''}
          onClick={() => setEsGasto(false)}
        >
          Ingreso
        </Button>
      </div>

      <ImporteKeypadInput
        label="Importe"
        value={magnitud}
        onChange={setMagnitud}
        colorClassName={esGasto ? 'text-[var(--color-loss)]' : 'text-[var(--color-gain)]'}
      />

      {loadingTaxonomia ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando categorías...</p>
      ) : (
        <>
          <CategoriaSelect categorias={categorias} value={categoriaId} onChange={(id) => { setCategoriaId(id); setSubcategoriaId(null); }} />
          <SubcategoriaSelect subcategorias={subcategorias} value={subcategoriaId} onChange={setSubcategoriaId} />
        </>
      )}

      {/* El nombre va despues de categoria/subcategoria a proposito: abrir un <select> justo
          tras escribir en un campo de texto deja el teclado de iOS animandose fuera todavia,
          y el desplegable nativo se renderiza con el viewport reducido (se ve "cortado" aunque
          se puede hacer scroll dentro). Con un select justo antes, no hay teclado que cerrar. */}
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Cena viernes" />

      {subcategoriaSeleccionada?.es_traspaso && (
        <p className="text-xs text-[var(--color-text-muted)] bg-black/5 dark:bg-white/5 rounded-md px-3 py-2">
          Un movimiento en {subcategoriaSeleccionada.nombre} es un traspaso a otra cuenta tuya, no dinero perdido:
          aunque salga en rojo del balance, sigue siendo tuyo, solo que guardado en otro sitio.
        </p>
      )}

      {puedeAsignarAObjetivo && (
        <div className="flex flex-col gap-2 border border-[var(--color-border)] rounded-md p-3">
          <Select
            label="Destinar a un objetivo de ahorro (opcional)"
            value={objetivoDestino}
            onChange={(e) => handleSeleccionarObjetivo(e.target.value)}
          >
            <option value="">No asignar</option>
            {objetivosActivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
          {objetivoDestino && (
            <Input
              label="Cantidad destinada (€)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={magnitud}
              value={importeAportacion || ''}
              onChange={(e) => setImporteAportacion(Math.min(Number(e.target.value), magnitud))}
            />
          )}
        </div>
      )}

      {subcategoriaSeleccionada?.nombre === 'Salario' && (
        <label className="flex items-center gap-2 text-sm border border-[var(--color-border)] rounded-md p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={esPrimerDiaMes}
            onChange={(e) => setEsPrimerDiaMes(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-accent)]"
          />
          Hacer primer día del mes
        </label>
      )}

      <Input label="Fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />

      <div>
        <button
          type="button"
          onClick={() => setMostrarMas((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <span className={`inline-block transition-transform ${mostrarMas ? 'rotate-90' : ''}`}>▸</span>
          Usuario, privacidad y nota
        </button>

        {mostrarMas && (
          <div className="flex flex-col gap-4 mt-3">
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

            <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[var(--color-loss)]">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <Modal open={confirmacionCierre !== null} onClose={cancelarCierre} title="Confirmar cierre de mes" centrado>
        <p className="text-sm mb-4">
          Vas a cerrar el mes {etiquetaMesCierre} con {confirmacionCierre?.dias} días. ¿Quieres proceder a cerrarlo?
        </p>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={cancelarCierre}>
            No
          </Button>
          <Button type="button" onClick={confirmarCierre} disabled={guardando}>
            Sí
          </Button>
        </div>
      </Modal>
    </form>
  );
}
