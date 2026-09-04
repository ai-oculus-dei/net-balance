import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { QuickAddButton } from '../movimientos/QuickAddButton';
import { QuickAddSheet } from '../movimientos/QuickAddSheet';
import { PatrimonioQuickAddSheet } from '../patrimonio/PatrimonioQuickAddSheet';
import type { MovimientoFormValues } from '../movimientos/MovimientoForm';
import type { PatrimonioFormValues } from '../patrimonio/PatrimonioForm';
import { crearMovimiento } from '../../lib/supabase/queries/movimientos';
import { crearAportacion } from '../../lib/supabase/queries/aportaciones';
import { crearPosicionPatrimonio } from '../../lib/supabase/queries/patrimonio';
import { crearPosicionFinanciada } from '../../lib/supabase/queries/ventas';
import { retirarDeCuenta } from '../../lib/finance/ventas';
import { precioCompraTotal } from '../../lib/finance/patrimonio';
import { emitMovimientosChanged } from '../../lib/events/movimientosBus';
import { emitObjetivosChanged } from '../../lib/events/objetivosBus';
import { emitPatrimonioChanged } from '../../lib/events/patrimonioBus';
import { useAuth } from '../../lib/auth/useAuth';
import { usePosicionesPatrimonio } from '../../hooks/usePosicionesPatrimonio';
import { VisualizacionesProvider } from '../../lib/visualizaciones/VisualizacionesProvider';

export function AppShell() {
  const { session } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { posiciones: posicionesPatrimonio } = usePosicionesPatrimonio();

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
    const movimiento = await crearMovimiento({
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

    if (values.aportacion) {
      await crearAportacion({
        movimiento_id: movimiento.id,
        objetivo_id: values.aportacion.objetivoId,
        importe: values.aportacion.importe,
      });
      emitObjetivosChanged();
    }
  }

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

  return (
    <div className="min-h-svh flex flex-col pb-24 sm:pb-0">
      <BottomNav />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
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
        />
      ) : (
        <QuickAddSheet open={quickAddOpen} onClose={handleCloseQuickAdd} onCreated={handleCreated} />
      )}
    </div>
  );
}
