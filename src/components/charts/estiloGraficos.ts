import type { CSSProperties } from 'react';

// Estilo comun de los graficos de Recharts (ejes, rejilla, tooltip y leyenda), con tokens.
export const TICK = { fontSize: 10, fill: 'var(--muted)', fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

export const TOOLTIP_CONTENT: CSSProperties = {
  background: 'var(--card-solid)',
  border: '1px solid var(--line-strong)',
  borderRadius: 12,
  boxShadow: 'var(--glow)',
  fontSize: 12,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  color: 'var(--text)',
  padding: '8px 10px',
};

export const TOOLTIP_LABEL: CSSProperties = { color: 'var(--muted)', marginBottom: 4 };

export const TOOLTIP_ITEM: CSSProperties = { padding: '1px 0' };

export const LEYENDA: CSSProperties = { fontSize: 11, lineHeight: '1.7em', color: 'var(--muted)' };
