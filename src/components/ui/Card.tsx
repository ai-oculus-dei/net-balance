import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // Brillo neon: solo para la tarjeta principal de cada pantalla.
  glow?: boolean;
}

export function Card({ children, className = '', glow = false, onClick, ...props }: CardProps) {
  return (
    <div
      className={`card ${glow ? 'glow' : ''} ${onClick ? 'card-interactive' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Titulo de tarjeta: pequeño, en mayusculas, gris, con un icono de linea en cian delante.
export function CardTitle({ icon, children, className = '' }: CardTitleProps) {
  return (
    <h2 className={`card-title ${className}`}>
      {icon}
      <span className="truncate">{children}</span>
    </h2>
  );
}
