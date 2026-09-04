import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TarjetaGrafico } from '../components/charts/TarjetaGrafico';
import { SerieTemporalLineasChart } from '../components/charts/SerieTemporalLineasChart';
import { LineasPieChart } from '../components/charts/LineasPieChart';
import { MAX_LINEAS } from '../components/charts/colorsCategoricos';
import { PatrimonioTotalCard } from '../components/patrimonio/PatrimonioTotalCard';
import { PatrimonioPnLCard } from '../components/patrimonio/PatrimonioPnLCard';
import { ActivoCard } from '../components/patrimonio/ActivoCard';
import { PatrimonioForm, type PatrimonioFormValues } from '../components/patrimonio/PatrimonioForm';
import { usePosicionesPatrimonio } from '../hooks/usePosicionesPatrimonio';
import { usePatrimonioHistorico } from '../hooks/usePatrimonioHistorico';
import { useUltimaActualizacionPrecios } from '../hooks/useUltimaActualizacionPrecios';
import { useTheme } from '../lib/theme/useTheme';
import {
  ETIQUETA_GRUPO,
  ETIQUETA_TIPO,
  agruparPorActivo,
  grupoDePosicion,
  historicoPorActivo,
  historicoTotalPorDia,
  patrimonioPorTipo,
  type GrupoPatrimonio,
} from '../lib/finance/patrimonio';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

export function PatrimonioPage() {
  const { theme } = useTheme();
  const { posiciones, loading: loadingPosiciones, actualizar, archivar } = usePosicionesPatrimonio();
  const { historico, loading: loadingHistorico } = usePatrimonioHistorico();
  const ultimaActualizacionPrecios = useUltimaActualizacionPrecios();
  const [editando, setEditando] = useState<PosicionPatrimonio | null>(null);

  const posicionesActivas = useMemo(() => posiciones.filter((p) => p.activa), [posiciones]);
  const activos = useMemo(() => agruparPorActivo(posicionesActivas), [posicionesActivas]);

  const datosPorTipo = useMemo(() => {
    return patrimonioPorTipo(posicionesActivas)
      .slice(0, MAX_LINEAS)
      .map((t, indice) => ({ id: t.tipo, colorIndex: indice, etiqueta: ETIQUETA_TIPO[t.tipo], neto: t.valor }));
  }, [posicionesActivas]);

  const serieTotal = useMemo(() => historicoTotalPorDia(historico), [historico]);
  const { puntos: puntosPorPosicion, lineas: lineasPorPosicion } = useMemo(
    () => historicoPorActivo(posicionesActivas, historico, MAX_LINEAS),
    [posicionesActivas, historico]
  );

  const loading = loadingPosiciones || loadingHistorico;

  async function handleActualizar(values: PatrimonioFormValues) {
    if (!editando) return;
    await actualizar(editando.id, values);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <PatrimonioTotalCard posiciones={posicionesActivas} historico={historico} loading={loading} />

      <PatrimonioPnLCard posiciones={posicionesActivas} loading={loading} />

      <TarjetaGrafico
        titulo="Por tipo de activo"
        render={(altura) =>
          loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : datosPorTipo.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Todavía no tienes posiciones.</p>
          ) : (
            <LineasPieChart datos={datosPorTipo} theme={theme} altura={altura} />
          )
        }
      />

      <TarjetaGrafico
        titulo="Histórico del patrimonio"
        render={(altura) =>
          loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : serieTotal.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay histórico.</p>
          ) : (
            <SerieTemporalLineasChart
              datos={serieTotal}
              lineas={[{ id: 'total', colorIndex: 0, etiqueta: 'Total' }]}
              theme={theme}
              altura={altura}
            />
          )
        }
      />

      <TarjetaGrafico
        titulo="Histórico por posición"
        render={(altura) =>
          loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : lineasPorPosicion.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay histórico.</p>
          ) : (
            <SerieTemporalLineasChart datos={puntosPorPosicion} lineas={lineasPorPosicion} theme={theme} altura={altura} />
          )
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : posicionesActivas.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Todavía no tienes posiciones. Usa el botón + para añadir la primera.
        </p>
      ) : (
        GRUPOS.map((grupo) => {
          const deEsteGrupo = activos.filter((a) => grupoDePosicion(a.tipo) === grupo);
          if (deEsteGrupo.length === 0) return null;
          return (
            <div key={grupo} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                {ETIQUETA_GRUPO[grupo]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {deEsteGrupo.map((a) => (
                  <ActivoCard key={a.id} activo={a} onEditarLote={setEditando} />
                ))}
              </div>
            </div>
          );
        })
      )}

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar posición">
        {editando && (
          <div className="flex flex-col gap-4">
            <PatrimonioForm
              initialValues={editando}
              posicionesExistentes={posicionesActivas}
              onSubmit={handleActualizar}
              onCancel={() => setEditando(null)}
            />
            <Button
              variant="danger"
              onClick={async () => {
                await archivar(editando.id);
                setEditando(null);
              }}
            >
              Archivar posición
            </Button>
          </div>
        )}
      </Modal>

      {ultimaActualizacionPrecios && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Precios actualizados: {formatearUltimaActualizacion(ultimaActualizacionPrecios)}
        </p>
      )}
    </div>
  );
}

function formatearUltimaActualizacion(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const esHoy = fecha.toDateString() === new Date().toDateString();
  return esHoy ? hora : `${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} ${hora}`;
}
