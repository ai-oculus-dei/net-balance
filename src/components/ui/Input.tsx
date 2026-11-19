import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <label className="field">
      {label && <span className="truncate">{label}</span>}
      <input id={id} className={`input ${className}`} {...props} />
    </label>
  );
}
