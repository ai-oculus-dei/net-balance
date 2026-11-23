import { Segmented } from '../ui/Segmented';
import { RANGOS_TEMPORALES, type RangoTemporal } from '../../lib/finance/rangosTemporales';

interface SelectorRangoProps {
  value: RangoTemporal;
  onChange: (rango: RangoTemporal) => void;
  full?: boolean;
}

// Selector de periodo tipo broker: 1W · 1M · 6M · YTD · 1Y · 5Y · ALL.
export function SelectorRango({ value, onChange, full = true }: SelectorRangoProps) {
  return (
    <Segmented
      size="sm"
      full={full}
      ariaLabel="Periodo del gráfico"
      value={value}
      onChange={onChange}
      options={RANGOS_TEMPORALES.map((r) => ({ value: r, label: r }))}
    />
  );
}
