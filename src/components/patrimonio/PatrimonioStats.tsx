import { Card } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { ETIQUETA_GRUPO, patrimonioPorGrupo } from '../../lib/finance/patrimonio';
import { formatearImporte } from '../../lib/finance/formato';
import type { PosicionPatrimonio } from '../../lib/supabase/database.types';

interface PatrimonioStatsProps {
  posiciones: PosicionPatrimonio[];
  loading: boolean;
}

// Desglose por grupo (Renta Variable/Renta Fija/Efectivo) — el total ya lo muestra en grande
// PatrimonioTotalCard, justo encima de esta tarjeta.
export function PatrimonioStats({ posiciones, loading }: PatrimonioStatsProps) {
  const porGrupo = patrimonioPorGrupo(posiciones);

  return (
    <Card>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatTile label={ETIQUETA_GRUPO.renta_variable} value={`${formatearImporte(porGrupo.renta_variable)} €`} />
          <StatTile label={ETIQUETA_GRUPO.renta_fija} value={`${formatearImporte(porGrupo.renta_fija)} €`} />
          <StatTile label={ETIQUETA_GRUPO.efectivo} value={`${formatearImporte(porGrupo.efectivo)} €`} />
        </div>
      )}
    </Card>
  );
}
