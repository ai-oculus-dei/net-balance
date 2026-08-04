import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTheme } from '../lib/theme/useTheme';
import { useAuth } from '../lib/auth/useAuth';
import { useProfiles } from '../hooks/useProfiles';

export function AjustesPage() {
  const { theme, toggleTheme } = useTheme();
  const { session, signOut } = useAuth();
  const { profiles } = useProfiles();

  const perfil = profiles.find((p) => p.id === session?.user.id);
  const urlAccesoDirecto = `${window.location.origin}${window.location.pathname}#/nuevo-gasto`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Cuenta
        </h2>
        <p className="text-sm">
          {perfil?.nombre ?? session?.user.email} <span className="text-[var(--color-text-muted)]">({session?.user.email})</span>
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Tema
        </h2>
        <Button variant="secondary" onClick={toggleTheme}>
          Cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Acceso directo: nuevo gasto
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          Añade este enlace a la pantalla de inicio del móvil para tener un icono que abre la app
          directamente sobre el alta rápida, sin pasar por el inicio.
        </p>
        <p className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded-md px-2 py-1.5 break-all mb-2">
          {urlAccesoDirecto}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          En iPhone: abre este enlace en Safari (no en la app instalada) → botón Compartir →
          "Añadir a pantalla de inicio".
        </p>
        <a href="#/nuevo-gasto">
          <Button type="button" variant="secondary">
            Abrir ahora
          </Button>
        </a>
      </Card>

      <Button variant="danger" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
