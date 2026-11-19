import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  return (
    <label className="field">
      {label && <span className="truncate">{label}</span>}
      <select id={id} className={`input ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
