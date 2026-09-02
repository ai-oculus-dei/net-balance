import { Card } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { ETIQUETA_GRUPO, patrimonioPorGrupo, patrimonioTotalActual } from '../../lib/finance/patrimonio';
import { formatearImporte } from '../../lib/finance/formato';
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
          <StatTile label="Total" value={`${formatearImporte(total)} €`} colorClassName="text-[var(--color-accent)]" />
          <StatTile label={ETIQUETA_GRUPO.renta_variable} value={`${formatearImporte(porGrupo.renta_variable)} €`} />
          <StatTile label={ETIQUETA_GRUPO.renta_fija} value={`${formatearImporte(porGrupo.renta_fija)} €`} />
          <StatTile label={ETIQUETA_GRUPO.efectivo} value={`${formatearImporte(porGrupo.efectivo)} €`} />
        </div>
      )}
    </Card>
  );
}
