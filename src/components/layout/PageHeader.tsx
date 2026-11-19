import type { ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons/UiIcons';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  sub?: ReactNode; // linea resumen pequeña en mono, debajo del titulo
  right?: ReactNode; // p.ej. selector de mes o boton
}

export function PageHeader({ icon, title, sub, right }: PageHeaderProps) {
  return (
    <header className="screen-head">
      <div className="min-w-0">
        <h1 className="screen-title">
          {icon}
          <span className="truncate">{title}</span>
        </h1>
        {sub && <p className="screen-sub truncate">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

interface SelectorMesProps {
  etiqueta: string; // p.ej. "NOV 2026"
  onAnterior: () => void;
  onSiguiente: () => void;
  // Contenido superpuesto sobre la etiqueta (p.ej. un <input type="month"> invisible para
  // elegir mes directamente al pulsarla).
  children?: ReactNode;
}

// Selector de mes con flechas: ‹ NOV 2026 ›
export function SelectorMes({ etiqueta, onAnterior, onSiguiente, children }: SelectorMesProps) {
  return (
    <div className="seg items-center !p-[3px]">
      <button type="button" onClick={onAnterior} aria-label="Mes anterior" className="!px-1.5 !py-1.5 flex items-center">
        <IconChevronLeft className="w-4 h-4" />
      </button>
      <div className="relative">
        <span className="block font-mono text-[12.5px] font-semibold text-fg uppercase tracking-[0.06em] px-1.5 pointer-events-none">
          {etiqueta}
        </span>
        {children}
      </div>
      <button type="button" onClick={onSiguiente} aria-label="Mes siguiente" className="!px-1.5 !py-1.5 flex items-center">
        <IconChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
