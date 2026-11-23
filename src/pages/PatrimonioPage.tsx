import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Cargando } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { IconPatrimonio } from '../components/layout/NavIcons';
import { IconActividad, IconArchivar, IconCapas } from '../components/icons/UiIcons';
import { Modal } from '../components/ui/Modal';
import { TarjetaGrafico } from '../components/charts/TarjetaGrafico';
import { PantallaCompletaGrafico } from '../components/charts/PantallaCompletaGrafico';
import { SerieTemporalLineasChart } from '../components/charts/SerieTemporalLineasChart';
import { GraficoTemporal } from '../components/charts/GraficoTemporal';
import { SelectorRango } from '../components/charts/SelectorRango';
import { RANGO_POR_DEFECTO, type RangoTemporal } from '../lib/finance/rangosTemporales';
import { MAX_LINEAS } from '../components/charts/colorsCategoricos';
import { PatrimonioTotalCard } from '../components/patrimonio/PatrimonioTotalCard';
import { PatrimonioPnLCard } from '../components/patrimonio/PatrimonioPnLCard';
import { RepartoCarteraCard } from '../components/patrimonio/RepartoCarteraCard';
import { useObjetivosCartera } from '../hooks/useObjetivosCartera';
import { CLAVE_BLOQUE_LIQUIDEZ, unidadesCartera, valorFondoEmergencia } from '../lib/finance/objetivosCartera';
import { FondoEmergenciaCard } from '../components/patrimonio/FondoEmergenciaCard';
import { ActivoCard } from '../components/patrimonio/ActivoCard';
import { PatrimonioForm, type PatrimonioFormValues } from '../components/patrimonio/PatrimonioForm';
import { VenderActivoForm } from '../components/patrimonio/VenderActivoForm';
import { AjustarCuentaForm } from '../components/patrimonio/AjustarCuentaForm';
import { HistoricoActivoVista } from '../components/patrimonio/HistoricoActivoVista';
import { usePosicionesPatrimonio } from '../hooks/usePosicionesPatrimonio';
import { usePatrimonioHistorico } from '../hooks/usePatrimonioHistorico';
import { usePreciosHistoricoActivo } from '../hooks/usePreciosHistoricoActivo';
import { useVentasPatrimonioLotes } from '../hooks/useVentasPatrimonioLotes';
import { useUltimaActualizacionPrecios } from '../hooks/useUltimaActualizacionPrecios';
import { useTheme } from '../lib/theme/useTheme';
import {
  ETIQUETA_GRUPO,
  agruparPorActivo,
  grupoDePosicion,
  historicoPorActivoDiario,
  historicoTotalPorDia,
  type ActivoAgrupado,
  type GrupoPatrimonio,
} from '../lib/finance/patrimonio';
import { precioDiarioDesdeFila, ventaLoteDesdeFila } from '../lib/finance/historicoPrecioActivo';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';

const GRUPOS: GrupoPatrimonio[] = ['renta_variable', 'renta_fija', 'efectivo'];

// Alto total (controles + grafico) del historico pequeno dentro de la tarjeta de un activo.
const ALTO_GRAFICO_EN_TARJETA = 260;

export function PatrimonioPage() {
  const { theme } = useTheme();
  const {
    objetivos: objetivosCartera,
    loading: loadingObjetivosCartera,
    error: errorObjetivosCartera,
    guardar: guardarObjetivoCartera,
  } = useObjetivosCartera();
  const { posiciones, loading: loadingPosiciones, actualizar, archivar, vender, ajustarCuenta } = usePosicionesPatrimonio();
  const { historico, loading: loadingHistorico } = usePatrimonioHistorico();
  const { precios: preciosHistoricosFilas, loading: loadingPrecios } = usePreciosHistoricoActivo();
  const { ventasLotes: ventasLotesFilas, loading: loadingVentasLotes } = useVentasPatrimonioLotes();
  const ultimaActualizacionPrecios = useUltimaActualizacionPrecios();
  const [rangoPosicion, setRangoPosicion] = useState<RangoTemporal>(RANGO_POR_DEFECTO);
  const [editando, setEditando] = useState<PosicionPatrimonio | null>(null);
  const [vendiendo, setVendiendo] = useState<ActivoAgrupado | null>(null);
  const [reduciendo, setReduciendo] = useState<ActivoAgrupado | null>(null);
  const [viendoGrafico, setViendoGrafico] = useState<ActivoAgrupado | null>(null);

  const posicionesActivas = useMemo(() => posiciones.filter((p) => p.activa), [posiciones]);
  const activos = useMemo(() => agruparPorActivo(posicionesActivas), [posicionesActivas]);
  const unidadesDeCartera = useMemo(() => unidadesCartera(posicionesActivas), [posicionesActivas]);
  const preciosHistoricos = useMemo(() => preciosHistoricosFilas.map(precioDiarioDesdeFila), [preciosHistoricosFilas]);
  const ventasLotes = useMemo(() => ventasLotesFilas.map(ventaLoteDesdeFila), [ventasLotesFilas]);

  const fondoEmergencia = useMemo(() => valorFondoEmergencia(posicionesActivas), [posicionesActivas]);

  const serieTotal = useMemo(
    () => historicoTotalPorDia(historico, posiciones, preciosHistoricos, ventasLotes),
    [historico, posiciones, preciosHistoricos, ventasLotes]
  );
  const { puntos: puntosPorPosicion, lineas: lineasPorPosicion } = useMemo(
    () => historicoPorActivoDiario(posicionesActivas, historico, MAX_LINEAS, posiciones, preciosHistoricos, ventasLotes),
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

  async function handleReducir(importe: number, fecha: string) {
    if (!reduciendo) return;
    await ajustarCuenta(reduciendo.lotes[0].id, -importe, fecha);
    setReduciendo(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={<IconPatrimonio />}
        title="Patrimonio"
        sub={loading ? 'cargando…' : `${activos.length} activos · ${posicionesActivas.length} posiciones`}
      />

      <PatrimonioTotalCard
        posiciones={posicionesActivas}
        historico={historico}
        loading={loading}
        todasLasPosiciones={posiciones}
        preciosHistoricos={preciosHistoricos}
        ventasLotes={ventasLotes}
      />

      <PatrimonioPnLCard posiciones={posicionesActivas} loading={loading} />

      <RepartoCarteraCard
        unidades={unidadesDeCartera}
        objetivos={objetivosCartera}
        loading={loadingPosiciones || loadingObjetivosCartera}
        error={errorObjetivosCartera}
        theme={theme}
        onGuardar={guardarObjetivoCartera}
      />

      <FondoEmergenciaCard
        valor={fondoEmergencia}
        objetivo={objetivosCartera.find((o) => o.clave === CLAVE_BLOQUE_LIQUIDEZ)}
        loading={loadingPosiciones || loadingObjetivosCartera}
        onGuardar={guardarObjetivoCartera}
      />

      <TarjetaGrafico
        titulo="Histórico del patrimonio"
        icono={<IconActividad />}
        render={(altura) =>
          loading ? (
            <Cargando />
          ) : serieTotal.length === 0 ? (
            <p className="empty">Todavía no hay histórico.</p>
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
        acciones={<SelectorRango value={rangoPosicion} onChange={setRangoPosicion} />}
        icono={<IconActividad />}
        render={(altura) =>
          loading ? (
            <Cargando />
          ) : lineasPorPosicion.length === 0 ? (
            <p className="empty">Todavía no hay histórico.</p>
          ) : (
            <GraficoTemporal puntos={puntosPorPosicion} lineas={lineasPorPosicion} rango={rangoPosicion} theme={theme} altura={altura} />
          )
        }
      />

      {loading ? (
        <Cargando />
      ) : posicionesActivas.length === 0 ? (
        <p className="empty card">
          Todavía no tienes posiciones. Usa el botón «Añadir» para añadir la primera.
        </p>
      ) : (
        GRUPOS.map((grupo) => {
          const deEsteGrupo = activos.filter((a) => grupoDePosicion(a.tipo) === grupo);
          if (deEsteGrupo.length === 0) return null;
          return (
            <div key={grupo} className="flex flex-col gap-3">
              <h2 className="card-title px-1 pt-2">
                <IconCapas />
                <span>{ETIQUETA_GRUPO[grupo]}</span>
                <span className="font-mono text-faint tracking-normal">{deEsteGrupo.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {deEsteGrupo.map((a) => (
                  <ActivoCard
                    key={a.id}
                    activo={a}
                    onEditarLote={setEditando}
                    onVender={setVendiendo}
                    onReducir={setReduciendo}
                    onVerGrafico={setViendoGrafico}
                    renderGrafico={(activo) => (
                      <HistoricoActivoVista
                        compacto
                        activo={activo}
                        todasLasPosiciones={posiciones}
                        preciosHistoricos={preciosHistoricos}
                        ventasLotes={ventasLotes}
                        altura={ALTO_GRAFICO_EN_TARJETA}
                      />
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar posición">
        {editando && (
          <div className="flex flex-col gap-3">
            <PatrimonioForm
              initialValues={editando}
              posicionesExistentes={posicionesActivas}
              onSubmit={handleActualizar}
              onAjustarCuenta={ajustarCuenta}
              onCancel={() => setEditando(null)}
            />
            <Button
              variant="danger"
              onClick={async () => {
                await archivar(editando.id);
                setEditando(null);
              }}
            >
              <IconArchivar />
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

      <Modal open={reduciendo !== null} onClose={() => setReduciendo(null)} title="Reducir">
        {reduciendo && (
          <AjustarCuentaForm etiquetaImporte="Importe a restar" onSubmit={handleReducir} onCancel={() => setReduciendo(null)} />
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
        <p className="text-center font-mono text-[11px] text-faint">
          precios actualizados · {formatearUltimaActualizacion(ultimaActualizacionPrecios)}
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
