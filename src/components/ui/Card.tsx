import type { HTMLAttributes } from 'react';

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
