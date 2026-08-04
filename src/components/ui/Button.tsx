import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent)] text-white hover:opacity-90',
  secondary: 'bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
  danger: 'bg-[var(--color-loss)] text-white hover:opacity-90',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
