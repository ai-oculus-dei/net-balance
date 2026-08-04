import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth/useAuth';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { ObjetivosPage } from './pages/ObjetivosPage';
import { VisualizacionesPage } from './pages/VisualizacionesPage';
import { AjustesPage } from './pages/AjustesPage';

function App() {
  const { session, loading } = useAuth();

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
          <Route path="nuevo-gasto" element={<DashboardPage />} />
          <Route path="movimientos" element={<MovimientosPage />} />
          <Route path="objetivos" element={<ObjetivosPage />} />
          <Route path="visualizaciones" element={<VisualizacionesPage />} />
          <Route path="ajustes" element={<AjustesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
