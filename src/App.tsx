import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth/useAuth';
import { generarMovimientosRecurrentes } from './lib/supabase/queries/movimientos';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { ObjetivosPage } from './pages/ObjetivosPage';
import { RecurrentesPage } from './pages/RecurrentesPage';
import { AjustesPage } from './pages/AjustesPage';

const ULTIMA_GENERACION_KEY = 'net-balance-ultima-generacion-recurrentes';

function useGenerarRecurrentesAlEntrar(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (localStorage.getItem(ULTIMA_GENERACION_KEY) === mesActual) return;
    generarMovimientosRecurrentes()
      .then(() => localStorage.setItem(ULTIMA_GENERACION_KEY, mesActual))
      .catch(() => {
        // Si falla (sin conexion, etc.), se reintenta en la siguiente carga de la app.
      });
  }, [activo]);
}

function App() {
  const { session, loading } = useAuth();
  useGenerarRecurrentesAlEntrar(Boolean(session));

  if (loading) {
    return <div className="min-h-svh flex items-center justify-center text-sm text-[var(--color-text-muted)]">Cargando...</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="movimientos" element={<MovimientosPage />} />
          <Route path="objetivos" element={<ObjetivosPage />} />
          <Route path="recurrentes" element={<RecurrentesPage />} />
          <Route path="ajustes" element={<AjustesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
