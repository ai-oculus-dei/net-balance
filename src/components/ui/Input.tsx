import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]">
      {label && <span>{label}</span>}
      <input
        id={id}
        className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${className}`}
        {...props}
      />
    </label>
  );
}
