import { useId } from 'react';
import { formatearImporte } from '../../lib/finance/formato';

interface ProgressRingProps {
  pct: number | null; // null = sin dato (anillo vacio y "—")
  etiqueta: string; // texto pequeño bajo el porcentaje
  size?: number;
}

const R = 46;
const CIRC = 2 * Math.PI * R;
const MARCAS = 60;

// Anillo de progreso: trazo en degradado cian -> violeta con brillo, marcas finas alrededor y el
// porcentaje en mono en el centro. Por encima del 100 % el anillo pasa a --bad.
export function ProgressRing({ pct, etiqueta, size = 132 }: ProgressRingProps) {
  const id = `ring-${useId().replace(/:/g, '')}`;
  const pasado = pct !== null && pct > 100;
  const relleno = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  const trazo = pasado ? 'var(--bad)' : `url(#${id})`;
  const brillo = pasado ? 'var(--bad)' : 'var(--cyan)';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        {Array.from({ length: MARCAS }, (_, i) => {
          const a = (i / MARCAS) * 2 * Math.PI;
          const largo = i % 5 === 0 ? 3.5 : 2;
          const r1 = 56;
          const r2 = r1 + largo;
          return (
            <line
              key={i}
              x1={60 + r1 * Math.sin(a)}
              y1={60 - r1 * Math.cos(a)}
              x2={60 + r2 * Math.sin(a)}
              y2={60 - r2 * Math.cos(a)}
              stroke={i % 5 === 0 ? 'var(--line-strong)' : 'var(--line)'}
              strokeWidth={1}
            />
          );
        })}
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--bg-2)" strokeWidth={8} />
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth={1} />
        {relleno > 0 && (
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={trazo}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${(relleno / 100) * CIRC} ${CIRC}`}
            transform="rotate(-90 60 60)"
            style={{
              filter: `drop-shadow(0 0 5px color-mix(in srgb, ${brillo} 55%, transparent))`,
              transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)',
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-mono text-[24px] font-semibold leading-none tracking-[-0.02em] ${pasado ? 'text-bad' : 'text-fg'}`}>
          {pct === null ? '—' : `${formatearImporte(pct, 0)}%`}
        </span>
        <span className="kpi-label !text-[9px] mt-1.5 max-w-[78px] leading-tight">{etiqueta}</span>
      </div>
    </div>
  );
}
