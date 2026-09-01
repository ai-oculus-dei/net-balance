import { Card } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { ETIQUETA_GRUPO, patrimonioPorGrupo, patrimonioTotalActual } from '../../lib/finance/patrimonio';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioStatsProps {
  posiciones: PosicionPatrimonio[];
  loading: boolean;
}

export function PatrimonioStats({ posiciones, loading }: PatrimonioStatsProps) {
  const total = patrimonioTotalActual(posiciones);
  const porGrupo = patrimonioPorGrupo(posiciones);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
        Patrimonio
      </h2>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Total" value={`${total.toFixed(2)} €`} colorClassName="text-[var(--color-accent)]" />
          <StatTile label={ETIQUETA_GRUPO.renta_variable} value={`${porGrupo.renta_variable.toFixed(2)} €`} />
          <StatTile label={ETIQUETA_GRUPO.renta_fija} value={`${porGrupo.renta_fija.toFixed(2)} €`} />
          <StatTile label={ETIQUETA_GRUPO.efectivo} value={`${porGrupo.efectivo.toFixed(2)} €`} />
        </div>
      )}
    </Card>
  );
}
