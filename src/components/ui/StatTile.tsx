import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface DesgloseFila {
  etiqueta: string;
  valor: string; // ya formateado (p.ej. "1.234,56 €"), igual que `value`
}

interface StatTileProps {
  label: string;
  value: string;
  colorClassName?: string;
  // Si se pasa (y no esta vacio), el nombre se puede pulsar para desplegar un rectangulo con las
  // filas que suman `value` — p.ej. las subcategorias detras de "Ingreso real".
  desglose?: DesgloseFila[];
  // "start": alineado a la izquierda (columna de indicadores junto al anillo de Inicio).
  align?: "center" | "start";
  size?: "md" | "lg";
}

const MARGEN_BORDE_PX = 8;

export function StatTile({ label, value, colorClassName = '', desglose, align = 'center', size = 'md' }: StatTileProps) {
  const [abierto, setAbierto] = useState(false);
  const [ajusteX, setAjusteX] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tieneDesglose = !!desglose && desglose.length > 0;

  useEffect(() => {
    if (!abierto) return;
    function handlePulsarFuera(e: MouseEvent | TouchEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', handlePulsarFuera);
    document.addEventListener('touchstart', handlePulsarFuera);
    return () => {
      document.removeEventListener('mousedown', handlePulsarFuera);
      document.removeEventListener('touchstart', handlePulsarFuera);
    };
  }, [abierto]);

  // Centrado bajo el nombre por defecto (ajusteX en 0); si eso lo saca de la pantalla — tarjetas
  // de la columna izquierda o derecha de la rejilla, cerca del borde — se corrige antes de que
  // el navegador pinte (useLayoutEffect), para que nunca quede pegado ni cortado por el borde.
  useLayoutEffect(() => {
    if (!abierto) {
      setAjusteX(0);
      return;
    }
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.left < MARGEN_BORDE_PX) {
      setAjusteX(MARGEN_BORDE_PX - rect.left);
    } else if (rect.right > window.innerWidth - MARGEN_BORDE_PX) {
      setAjusteX(window.innerWidth - MARGEN_BORDE_PX - rect.right);
    }
  }, [abierto]);

  return (
    <div ref={contenedorRef} className={`relative flex flex-col gap-1 min-w-0 ${align === 'start' ? 'items-start text-left' : 'items-center text-center'}`}>
      {tieneDesglose ? (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="kpi-label underline decoration-dotted decoration-faint underline-offset-[3px]"
        >
          {label}
        </button>
      ) : (
        <p className="kpi-label">{label}</p>
      )}
      <p className={`font-mono font-semibold leading-tight tracking-[-0.01em] whitespace-nowrap ${size === 'lg' ? 'text-[19px]' : 'text-[17px]'} ${colorClassName}`}>{value}</p>

      {tieneDesglose && abierto && (
        <div
          ref={popoverRef}
          style={{ transform: align === 'start' ? `translateX(${ajusteX}px)` : `translateX(calc(-50% + ${ajusteX}px))` }}
          className={`popover absolute top-full mt-1.5 z-20 w-60 max-w-[85vw] ${align === 'start' ? 'left-0' : 'left-1/2'}`}
        >
          {desglose!.map((fila) => (
            <div
              key={fila.etiqueta}
              className="flex items-center justify-between gap-2 py-1.5 text-xs border-b border-dashed border-line last:border-0"
            >
              <span className="text-muted truncate">{fila.etiqueta}</span>
              <span className="font-mono font-semibold shrink-0">{fila.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
