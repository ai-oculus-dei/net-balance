import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]">
      {label && <span>{label}</span>}
      <select
        id={id}
        className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
