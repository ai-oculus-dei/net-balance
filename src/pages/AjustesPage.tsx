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

      <Button variant="danger" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
