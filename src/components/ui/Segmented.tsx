import type { ReactNode } from 'react';

export interface OpcionSegmentada<T extends string> {
  value: T;
  label: ReactNode;
  // Color del elemento activo cuando no es el neutro (Gasto -> rojo, Ingreso -> verde).
  tone?: 'bad' | 'ok';
}

interface SegmentedProps<T extends string> {
  options: OpcionSegmentada<T>[];
  value: T;
  onChange: (value: T) => void;
  full?: boolean; // ocupa todo el ancho, opciones a partes iguales
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

// Selector segmentado (pestañas, modos €/%, EUR/USD, Oscuro/Claro...).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full = false,
  size = 'md',
  ariaLabel,
  className = '',
}: SegmentedProps<T>) {
  return (
    <div className={`seg ${full ? 'full' : ''} ${size === 'sm' ? 'sm' : ''} ${className}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`${value === o.value ? 'on' : ''} ${o.tone ? `tone-${o.tone}` : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
