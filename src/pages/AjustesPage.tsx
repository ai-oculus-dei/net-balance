import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { PageHeader } from '../components/layout/PageHeader';
import { IconAjustes } from '../components/layout/NavIcons';
import { IconEnlace, IconLuna, IconMovil, IconSalir, IconSol, IconUsuario } from '../components/icons/UiIcons';
import { useTheme } from '../lib/theme/useTheme';
import { useAuth } from '../lib/auth/useAuth';
import { useProfiles } from '../hooks/useProfiles';

export function AjustesPage() {
  const { theme, setTheme } = useTheme();
  const { session, signOut } = useAuth();
  const { profiles } = useProfiles();

  const perfil = profiles.find((p) => p.id === session?.user.id);
  const urlAccesoDirecto = `${window.location.origin}${window.location.pathname}#/nuevo-gasto`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader icon={<IconAjustes />} title="Ajustes" sub={session?.user.email} />

      <Card>
        <CardTitle icon={<IconUsuario />} className="mb-3">
          Cuenta
        </CardTitle>
        <p className="text-[15px] font-medium truncate">{perfil?.nombre ?? session?.user.email}</p>
        <p className="font-mono text-xs text-muted truncate mt-0.5">{session?.user.email}</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <CardTitle icon={theme === 'dark' ? <IconLuna /> : <IconSol />}>Tema</CardTitle>
          <Segmented
            ariaLabel="Tema"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Oscuro' },
              { value: 'light', label: 'Claro' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardTitle icon={<IconMovil />} className="mb-3">
          Acceso directo: nuevo gasto
        </CardTitle>
        <p className="text-sm text-muted leading-relaxed mb-3">
          Añade este enlace a la pantalla de inicio del móvil para tener un icono que abre la app
          directamente sobre el alta rápida, sin pasar por el inicio.
        </p>
        <p className="flex items-start gap-2 text-xs font-mono bg-bg-2 border border-line rounded-[10px] px-3 py-2.5 break-all mb-3">
          <IconEnlace className="w-3.5 h-3.5 text-cyan mt-px" />
          <span className="min-w-0">{urlAccesoDirecto}</span>
        </p>
        <p className="text-xs text-muted leading-relaxed mb-4">
          En iPhone: abre este enlace en Safari (no en la app instalada) → botón Compartir →
          "Añadir a pantalla de inicio".
        </p>
        <a href="#/nuevo-gasto">
          <Button type="button" variant="secondary" className="w-full">
            Abrir ahora
          </Button>
        </a>
      </Card>

      <Button variant="danger" onClick={signOut}>
        <IconSalir />
        Cerrar sesión
      </Button>
    </div>
  );
}
