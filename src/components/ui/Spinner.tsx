interface CargandoProps {
  texto?: string;
  className?: string;
}

// Estado de carga: spinner cian + texto en gris.
export function Cargando({ texto = 'Cargando...', className = '' }: CargandoProps) {
  return (
    <p className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <span className="spin" aria-hidden="true" />
      {texto}
    </p>
  );
}
