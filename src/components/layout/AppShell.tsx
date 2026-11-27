import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { AvisoCartera } from './AvisoCartera';
import { AvisoGastos } from './AvisoGastos';
import { AvisoClasificacion } from './AvisoClasificacion';
import { usePreferencias } from '../../lib/preferencias/usePreferencias';
import { QuickAddButton } from '../movimientos/QuickAddButton';
import { QuickAddSheet } from '../movimientos/QuickAddSheet';
import { PatrimonioQuickAddSheet } from '../patrimonio/PatrimonioQuickAddSheet';
import type { MovimientoFormValues } from '../movimientos/MovimientoForm';
import type { PatrimonioFormValues } from '../patrimonio/PatrimonioForm';
import { crearMovimiento } from '../../lib/supabase/queries/movimientos';
import { ajustarCuentaPatrimonio, crearPosicionPatrimonio } from '../../lib/supabase/queries/patrimonio';
import { crearPosicionFinanciada } from '../../lib/supabase/queries/ventas';
import { ajustarCuenta, retirarDeCuenta } from '../../lib/finance/ventas';
import { esCuentaGastos, precioCompraTotal } from '../../lib/finance/patrimonio';
import { toIsoDate } from '../../lib/finance/fechas';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';
import { emitMovimientosChanged } from '../../lib/events/movimientosBus';
import { emitPatrimonioChanged } from '../../lib/events/patrimonioBus';
import { useAuth } from '../../lib/auth/useAuth';
import { usePosicionesPatrimonio } from '../../hooks/usePosicionesPatrimonio';
import { useSincronizarCuentaGastos } from '../../hooks/useSincronizarCuentaGastos';
import { VisualizacionesProvider } from '../../lib/visualizaciones/VisualizacionesProvider';

export function AppShell() {
  const { session } = useAuth();
  const { preferencias } = usePreferencias();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { posiciones: posicionesPatrimonio, loading: loadingPosicionesPatrimonio } = usePosicionesPatrimonio();
  useSincronizarCuentaGastos(posicionesPatrimonio, loadingPosicionesPatrimonio);
  const posicionesActivas = useMemo(() => posicionesPatrimonio.filter((p) => p.activa), [posicionesPatrimonio]);

  const enPatrimonio = location.pathname.startsWith('/patrimonio');

  // Permite un acceso directo instalado aparte en el movil (ver Ajustes) que abre la app
  // directamente sobre el alta rapida, sin pasar por el dashboard.
  useEffect(() => {
    if (location.pathname === '/nuevo-gasto') setQuickAddOpen(true);
  }, [location.pathname]);

  function handleCloseQuickAdd() {
    setQuickAddOpen(false);
    if (location.pathname === '/nuevo-gasto') navigate('/', { replace: true });
  }

  async function handleCreated(values: MovimientoFormValues) {
    if (!session) return;
    // Movimiento de Ahorro con cuenta elegida: el gasto (importe < 0) se suma a la cuenta y el
    // ingreso se le resta. Se calcula ANTES de crear el movimiento para que, si la cuenta no
    // tiene saldo suficiente, falle sin dejar el movimiento guardado a medias.
    const fechaAjuste = toIsoDate(new Date(values.fecha));
    const cuenta = values.cuentaPatrimonioId ? posicionesPatrimonio.find((p) => p.id === values.cuentaPatrimonioId) : undefined;
    const ajuste = cuenta ? ajustarCuenta(cuenta, -values.importe, new Date(`${fechaAjuste}T00:00:00`)) : null;

    await crearMovimiento({
      nombre: values.nombre,
      fecha: values.fecha,
      importe: values.importe,
      subcategoria_id: values.subcategoria_id,
      usuario_id: values.usuario_id,
      creado_por: session.user.id,
      visibilidad: values.visibilidad,
      nota: values.nota || null,
      es_primer_dia_mes: values.esPrimerDiaMes,
    });
    emitMovimientosChanged();

    if (cuenta && ajuste) {
      await ajustarCuentaPatrimonio(cuenta.id, ajuste, fechaAjuste);
      emitPatrimonioChanged();
    }
  }

  // Cuentas a las que puede ir (o de las que puede salir) un movimiento de Ahorro: corrientes,
  // remuneradas y de ahorro activas, sin la cuenta "Gastos" (esa ya se sincroniza sola con el
  // balance del mes). Primero las de ahorro, luego remuneradas, luego corrientes.
  const cuentasAhorro = useMemo(() => {
    const orden: Partial<Record<PosicionPatrimonio['tipo'], number>> = { cuenta_ahorro: 0, cuenta_remunerada: 1, cuenta_corriente: 2 };
    return posicionesActivas
      .filter((p) => orden[p.tipo] !== undefined && !esCuentaGastos(p))
      .sort((a, b) => orden[a.tipo]! - orden[b.tipo]! || a.nombre.localeCompare(b.nombre, 'es'));
  }, [posicionesActivas]);

  async function handlePatrimonioCreated(values: PatrimonioFormValues) {
    if (!session) return;
    const { cuentaOrigenId, ...posicion } = values;
    if (cuentaOrigenId) {
      const loteOrigen = posicionesPatrimonio.find((p) => p.id === cuentaOrigenId);
      if (!loteOrigen) return;
      const costeCompra = precioCompraTotal(posicion);
      const resultadoOrigen = retirarDeCuenta(loteOrigen, costeCompra);
      await crearPosicionFinanciada(posicion, cuentaOrigenId, resultadoOrigen);
    } else {
      await crearPosicionPatrimonio(posicion);
    }
    emitPatrimonioChanged();
  }

  async function handlePatrimonioAjustado(posicionId: string, importe: number, fecha: string) {
    if (!session) return;
    const lote = posicionesPatrimonio.find((p) => p.id === posicionId);
    if (!lote) return;
    const resultado = ajustarCuenta(lote, importe, new Date(`${fecha}T00:00:00`));
    await ajustarCuentaPatrimonio(posicionId, resultado, fecha);
    emitPatrimonioChanged();
  }

  return (
    <div className="min-h-svh flex flex-col">
      <BottomNav />

      <main className="shell flex-1">
        <AvisoClasificacion />
        {preferencias.avisoCartera &&<AvisoCartera posicionesActivas={posicionesActivas} loading={loadingPosicionesPatrimonio} />}
        {preferencias.avisoGastos && <AvisoGastos />}
        <VisualizacionesProvider>
          <Outlet />
        </VisualizacionesProvider>
      </main>

      <QuickAddButton
        onClick={() => setQuickAddOpen(true)}
        ariaLabel={enPatrimonio ? 'Añadir patrimonio' : 'Añadir movimiento'}
      />
      {enPatrimonio ? (
        <PatrimonioQuickAddSheet
          open={quickAddOpen}
          posicionesExistentes={posicionesPatrimonio.filter((p) => p.activa)}
          onClose={() => setQuickAddOpen(false)}
          onCreated={handlePatrimonioCreated}
          onAjustarCuenta={handlePatrimonioAjustado}
        />
      ) : (
        <QuickAddSheet open={quickAddOpen} onClose={handleCloseQuickAdd} onCreated={handleCreated} cuentasAhorro={cuentasAhorro} />
      )}
    </div>
  );
}
