import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TarjetaGrafico } from '../components/charts/TarjetaGrafico';
import { PantallaCompletaGrafico } from '../components/charts/PantallaCompletaGrafico';
import { SerieTemporalLineasChart } from '../components/charts/SerieTemporalLineasChart';
import { LineasPieChart } from '../components/charts/LineasPieChart';
import { MAX_LINEAS } from '../components/charts/colorsCategoricos';
import { PatrimonioTotalCard } from '../components/patrimonio/PatrimonioTotalCard';
import { PatrimonioPnLCard } from '../components/patrimonio/PatrimonioPnLCard';
import { ActivoCard } from '../components/patrimonio/ActivoCard';
import { PatrimonioForm, type PatrimonioFormValues } from '../components/patrimonio/PatrimonioForm';
import { VenderActivoForm } from '../components/patrimonio/VenderActivoForm';
import { HistoricoActivoVista } from '../components/patrimonio/HistoricoActivoVista';
import { usePosicionesPatrimonio } from '../hooks/usePosicionesPatrimonio';
import { usePatrimonioHistorico } from '../hooks/usePatrimonioHistorico';
import { usePreciosHistoricoActivo } from '../hooks/usePreciosHistoricoActivo';
import { useVentasPatrimonioLotes } from '../hooks/useVentasPatrimonioLotes';
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
  type ActivoAgrupado,
  type GrupoPatrimonio,
} from '../lib/finance/patrimonio';
import { precioDiarioDesdeFila, ventaLoteDesdeFila } from '../lib/finance/historicoPrecioActivo';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

export function PatrimonioPage() {
  const { theme } = useTheme();
  const { posiciones, loading: loadingPosiciones, actualizar, archivar, vender } = usePosicionesPatrimonio();
  const { historico, loading: loadingHistorico } = usePatrimonioHistorico();
  const { precios: preciosHistoricosFilas, loading: loadingPrecios } = usePreciosHistoricoActivo();
  const { ventasLotes: ventasLotesFilas, loading: loadingVentasLotes } = useVentasPatrimonioLotes();
  const ultimaActualizacionPrecios = useUltimaActualizacionPrecios();
  const [editando, setEditando] = useState<PosicionPatrimonio | null>(null);
  const [vendiendo, setVendiendo] = useState<ActivoAgrupado | null>(null);
  const [viendoGrafico, setViendoGrafico] = useState<ActivoAgrupado | null>(null);

  const posicionesActivas = useMemo(() => posiciones.filter((p) => p.activa), [posiciones]);
  const activos = useMemo(() => agruparPorActivo(posicionesActivas), [posicionesActivas]);
  const preciosHistoricos = useMemo(() => preciosHistoricosFilas.map(precioDiarioDesdeFila), [preciosHistoricosFilas]);
  const ventasLotes = useMemo(() => ventasLotesFilas.map(ventaLoteDesdeFila), [ventasLotesFilas]);

  const datosPorTipo = useMemo(() => {
    return patrimonioPorTipo(posicionesActivas)
      .slice(0, MAX_LINEAS)
      .map((t, indice) => ({ id: t.tipo, colorIndex: indice, etiqueta: ETIQUETA_TIPO[t.tipo], neto: t.valor }));
  }, [posicionesActivas]);

  const serieTotal = useMemo(
    () => historicoTotalPorDia(historico, posiciones, preciosHistoricos, ventasLotes),
    [historico, posiciones, preciosHistoricos, ventasLotes]
  );
  const { puntos: puntosPorPosicion, lineas: lineasPorPosicion } = useMemo(
    () => historicoPorActivo(posicionesActivas, historico, MAX_LINEAS, posiciones, preciosHistoricos, ventasLotes),
    [posicionesActivas, historico, posiciones, preciosHistoricos, ventasLotes]
  );

  const loading = loadingPosiciones || loadingHistorico || loadingPrecios || loadingVentasLotes;

  async function handleActualizar(values: PatrimonioFormValues) {
    if (!editando) return;
    // cuentaOrigenId no es una columna de posiciones_patrimonio (solo se usa al crear, ver
    // AppShell.handlePatrimonioCreated) — nunca deberia venir informado desde el modo edicion,
    // pero se descarta explicitamente para no enviarlo en el update.
    const { cuentaOrigenId: _cuentaOrigenId, ...cambios } = values;
    const cambiosFinales: Partial<PosicionPatrimonio> = { ...cambios };
    // Corregir a mano la cantidad de una compra ya existente no es lo mismo que venderla: se
    // desplaza cantidad_original por el mismo delta para no confundir esta correccion con una
    // venta (que reduce `cantidad` sin tocar `cantidad_original`, ver ventas.ts).
    if (cambios.cantidad !== editando.cantidad) {
      cambiosFinales.cantidad_original = editando.cantidad_original + (cambios.cantidad - editando.cantidad);
    }
    await actualizar(editando.id, cambiosFinales);
    setEditando(null);
  }

  async function handleVender(cantidad: number, precioVentaUnitario: number, cuentaDestinoId: string | null) {
    if (!vendiendo) return;
    await vender(vendiendo, cantidad, precioVentaUnitario, cuentaDestinoId);
    setVendiendo(null);
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
                  <ActivoCard
                    key={a.id}
                    activo={a}
                    onEditarLote={setEditando}
                    onVender={setVendiendo}
                    onVerGrafico={setViendoGrafico}
                  />
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

      <Modal open={vendiendo !== null} onClose={() => setVendiendo(null)} title="Vender">
        {vendiendo && (
          <VenderActivoForm
            activo={vendiendo}
            posicionesExistentes={posicionesActivas}
            onSubmit={handleVender}
            onCancel={() => setVendiendo(null)}
          />
        )}
      </Modal>

      <PantallaCompletaGrafico
        abierto={viendoGrafico !== null}
        onClose={() => setViendoGrafico(null)}
        render={(altura) =>
          viendoGrafico && (
            <HistoricoActivoVista
              activo={viendoGrafico}
              todasLasPosiciones={posiciones}
              preciosHistoricos={preciosHistoricos}
              ventasLotes={ventasLotes}
              altura={altura}
            />
          )
        }
      />

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
