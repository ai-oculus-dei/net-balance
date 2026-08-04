import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { QuickAddButton } from '../movimientos/QuickAddButton';
import { QuickAddSheet } from '../movimientos/QuickAddSheet';
import type { MovimientoFormValues } from '../movimientos/MovimientoForm';
import { crearMovimiento } from '../../lib/supabase/queries/movimientos';
import { emitMovimientosChanged } from '../../lib/events/movimientosBus';
import { useAuth } from '../../lib/auth/useAuth';

export function AppShell() {
  const { session } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  async function handleCreated(values: MovimientoFormValues) {
    if (!session) return;
    await crearMovimiento({
      nombre: values.nombre,
      fecha: values.fecha,
      importe: values.importe,
      subcategoria_id: values.subcategoria_id,
      usuario_id: values.usuario_id,
      creado_por: session.user.id,
      visibilidad: values.visibilidad,
      es_recurrente: false,
      gasto_recurrente_id: null,
      mes_generado: null,
      nota: values.nota || null,
    });
    emitMovimientosChanged();
  }

  return (
    <div className="min-h-svh flex flex-col pb-20 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--color-text)]">NET BALANCE</h1>
      </header>

      <BottomNav />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
        <Outlet />
      </main>

      <QuickAddButton onClick={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
