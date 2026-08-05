import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { QuickAddButton } from '../movimientos/QuickAddButton';
import { QuickAddSheet } from '../movimientos/QuickAddSheet';
import type { MovimientoFormValues } from '../movimientos/MovimientoForm';
import { crearMovimiento } from '../../lib/supabase/queries/movimientos';
import { crearAportacion } from '../../lib/supabase/queries/aportaciones';
import { emitMovimientosChanged } from '../../lib/events/movimientosBus';
import { emitObjetivosChanged } from '../../lib/events/objetivosBus';
import { useAuth } from '../../lib/auth/useAuth';
import { VisualizacionesProvider } from '../../lib/visualizaciones/VisualizacionesProvider';

export function AppShell() {
  const { session } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-svh flex flex-col pb-24 sm:pb-0">
      <BottomNav />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
        <VisualizacionesProvider>
          <Outlet />
        </VisualizacionesProvider>
      </main>

      <QuickAddButton onClick={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={handleCloseQuickAdd} onCreated={handleCreated} />
    </div>
  );
}
