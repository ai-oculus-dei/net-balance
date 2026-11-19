import { useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/ui/Card';
import { Cargando } from '../components/ui/Spinner';
import { PageHeader, SelectorMes } from '../components/layout/PageHeader';
import { IconMovimientos } from '../components/layout/NavIcons';
import { IconFiltro, IconLista, IconPapelera, IconSuma } from '../components/icons/UiIcons';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { MovimientoRow } from '../components/movimientos/MovimientoRow';
import { MovimientoForm, type MovimientoFormValues } from '../components/movimientos/MovimientoForm';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTaxonomia } from '../hooks/useTaxonomia';
import { useAnclasPeriodo } from '../hooks/useAnclasPeriodo';
import { formatearMes, parseMes } from '../lib/finance/fechas';
import { indexarSubcategorias } from '../lib/finance/taxonomia';
import { resolverRangoMes } from '../lib/finance/periodos';
import { formatearImporte } from '../lib/finance/formato';
import { claseColorPorSigno } from '../components/charts/colors';
import type { Movimiento } from '../lib/supabase/database.types';

export function MovimientosPage() {
  const [mes, setMes] = useState(() => formatearMes(new Date()));
  const fechaBase = useMemo(() => parseMes(mes), [mes]);
  const { anclas } = useAnclasPeriodo();
  const rango = useMemo(() => resolverRangoMes(anclas, fechaBase), [anclas, fechaBase]);

  function cambiarMes(delta: number) {
    setMes(formatearMes(new Date(fechaBase.getFullYear(), fechaBase.getMonth() + delta, 1)));
  }

  const { movimientos, loading, actualizar, borrar } = useMovimientos(rango);
  const { categorias, subcategorias, subcategoriasDe } = useTaxonomia();
  const subcategoriasPorId = useMemo(() => indexarSubcategorias(subcategorias), [subcategorias]);

  const [filtroCategoriaId, setFiltroCategoriaId] = useState<number | null>(null);
  const [filtroSubcategoriaId, setFiltroSubcategoriaId] = useState<number | null>(null);
  const subcategoriasDelFiltro = filtroCategoriaId !== null ? subcategoriasDe(filtroCategoriaId) : [];

  const movimientosFiltrados = useMemo(() => {
    if (filtroCategoriaId === null) return movimientos;
    return movimientos.filter((m) => {
      const sub = subcategoriasPorId.get(m.subcategoria_id);
      if (!sub || sub.categoria_id !== filtroCategoriaId) return false;
      if (filtroSubcategoriaId !== null && sub.id !== filtroSubcategoriaId) return false;
      return true;
    });
  }, [movimientos, subcategoriasPorId, filtroCategoriaId, filtroSubcategoriaId]);

  // Suma de los movimientos que pasan el filtro actual (neto con signo, y por separado lo que
  // entra y lo que sale). En centimos para no arrastrar errores de coma flotante.
  const totales = useMemo(() => {
    let ingresosCent = 0;
    let gastosCent = 0;
    for (const m of movimientosFiltrados) {
      const cent = Math.round(m.importe * 100);
      if (cent >= 0) ingresosCent += cent;
      else gastosCent += cent;
    }
    return { neto: (ingresosCent + gastosCent) / 100, ingresos: ingresosCent / 100, gastos: gastosCent / 100 };
  }, [movimientosFiltrados]);

  const [editando, setEditando] = useState<Movimiento | null>(null);

  async function handleUpdate(values: MovimientoFormValues) {
    if (!editando) return;
    await actualizar(editando.id, {
      nombre: values.nombre,
      fecha: values.fecha,
      importe: values.importe,
      subcategoria_id: values.subcategoria_id,
      usuario_id: values.usuario_id,
      visibilidad: values.visibilidad,
      nota: values.nota || null,
      es_primer_dia_mes: values.esPrimerDiaMes,
    });
    setEditando(null);
  }

  const etiquetaMes = fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const etiquetaMesCorta = fechaBase.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '');

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<IconMovimientos />}
        title="Movimientos"
        sub={loading ? 'cargando…' : `${movimientosFiltrados.length} movimientos`}
        right={
          <SelectorMes etiqueta={etiquetaMesCorta} onAnterior={() => cambiarMes(-1)} onSiguiente={() => cambiarMes(1)}>
            <input
              type="month"
              value={mes}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              aria-label="Elegir mes y año"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </SelectorMes>
        }
      />

      <Card>
        <CardTitle icon={<IconFiltro />} className="mb-3">
          Filtros
        </CardTitle>
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Categoría"
            value={filtroCategoriaId ?? ''}
            onChange={(e) => {
              const valor = e.target.value;
              setFiltroCategoriaId(valor === '' ? null : Number(valor));
              setFiltroSubcategoriaId(null);
            }}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select
            label="Subcategoría"
            value={filtroSubcategoriaId ?? ''}
            onChange={(e) => setFiltroSubcategoriaId(e.target.value === '' ? null : Number(e.target.value))}
            disabled={filtroCategoriaId === null}
          >
            <option value="">Todas</option>
            {subcategoriasDelFiltro.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle icon={<IconSuma />}>
            {filtroCategoriaId === null ? 'Total del mes' : 'Total filtrado'}
          </CardTitle>
          {loading ? (
            <span className="spin" aria-hidden="true" />
          ) : (
            <span className={`kpi-value shrink-0 ${claseColorPorSigno(totales.neto)}`}>
              {totales.neto > 0 ? '+' : ''}
              {formatearImporte(totales.neto)} €
            </span>
          )}
        </div>
        {!loading && (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-dashed border-line font-mono text-xs">
            <span className="text-muted">
              {movimientosFiltrados.length} {movimientosFiltrados.length === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <span className="flex gap-3 shrink-0">
              <span className="text-ok">+{formatearImporte(totales.ingresos)} €</span>
              <span className="text-bad">{formatearImporte(totales.gastos)} €</span>
            </span>
          </div>
        )}
      </Card>

      <Card glow>
        <CardTitle icon={<IconLista />} className="mb-1">
          {etiquetaMes}
        </CardTitle>
        {loading ? (
          <Cargando className="py-3" />
        ) : movimientosFiltrados.length === 0 ? (
          <p className="empty">
            {filtroCategoriaId === null ? 'Sin movimientos este mes.' : 'Sin movimientos con ese filtro este mes.'}
          </p>
        ) : (
          movimientosFiltrados.map((m) => (
            <MovimientoRow
              key={m.id}
              movimiento={m}
              subcategoria={subcategoriasPorId.get(m.subcategoria_id)}
              onClick={() => setEditando(m)}
            />
          ))
        )}
      </Card>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar movimiento">
        {editando && (
          <div className="flex flex-col gap-3">
            <MovimientoForm
              initialValues={editando}
              onSubmit={handleUpdate}
              onCancel={() => setEditando(null)}
            />
            <Button
              variant="danger"
              onClick={async () => {
                await borrar(editando.id);
                setEditando(null);
              }}
            >
              <IconPapelera />
              Borrar movimiento
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
