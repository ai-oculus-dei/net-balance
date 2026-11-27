import { useState } from 'react';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Segmented';
import { PageHeader } from '../components/layout/PageHeader';
import { IconAjustes } from '../components/layout/NavIcons';
import { IconDescargar, IconLuna, IconSalir, IconSol, IconUsuario } from '../components/icons/UiIcons';
import { ExportarForm } from '../components/ajustes/ExportarForm';
import { PresupuestoGastoCard } from '../components/ajustes/PresupuestoGastoCard';
import { ClaseGastoCard } from '../components/ajustes/ClaseGastoCard';
import { AvisosCard, ConfiguracionPorDefectoCard } from '../components/ajustes/PreferenciasCards';
import { useTheme } from '../lib/theme/useTheme';
import { useAuth } from '../lib/auth/useAuth';
import { useProfiles } from '../hooks/useProfiles';

export function AjustesPage() {
  const { theme, setTheme } = useTheme();
  const { session, signOut } = useAuth();
  const { profiles } = useProfiles();
  const [exportando, setExportando] = useState(false);

  const perfil = profiles.find((p) => p.id === session?.user.id);

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

      <ConfiguracionPorDefectoCard />

      <PresupuestoGastoCard />

      <ClaseGastoCard />

      <AvisosCard />

      <Card>
        <CardTitle icon={<IconDescargar />} className="mb-3">
          Exportar datos
        </CardTitle>
        <p className="text-sm text-muted leading-relaxed mb-4">
          Descarga en CSV los movimientos y el valor diario del patrimonio entre dos fechas.
        </p>
        <Button type="button" variant="secondary" className="w-full" onClick={() => setExportando(true)}>
          <IconDescargar />
          Exportar
        </Button>
      </Card>

      <Modal open={exportando} onClose={() => setExportando(false)} title="Exportar CSV">
        <ExportarForm />
      </Modal>

      <Button variant="danger" onClick={signOut}>
        <IconSalir />
        Cerrar sesión
      </Button>
    </div>
  );
}
