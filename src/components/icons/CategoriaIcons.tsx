import type { SVGProps } from 'react';

// Mismo estilo que src/components/layout/NavIcons.tsx: trazo minimalista 24x24,
// currentColor, sin relleno salvo algun punto/detalle pequeno.
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ============================================================
// Categorias (8)
// ============================================================

export function IconVivienda(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10.5V19h12v-8.5" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function IconTransporte(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16V12l2-4h12l2 4v4" />
      <path d="M4 16h16" />
      <circle cx="8" cy="17.5" r="1.4" />
      <circle cx="16" cy="17.5" r="1.4" />
    </svg>
  );
}

export function IconAlimentacion(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4v7a2 2 0 0 0 4 0V4" />
      <path d="M7 11v9" />
      <path d="M17 4c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4" />
      <path d="M17 4v16" />
    </svg>
  );
}

export function IconSalud(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function IconDeporte(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4h8l1 4-5 4-5-4 1-4Z" />
      <path d="M12 12v4" />
      <path d="M8 20h8" />
      <path d="M10 20v-4" />
      <path d="M14 20v-4" />
    </svg>
  );
}

export function IconOcio(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 14.3 9l6 .6-4.5 4 1.3 5.9L12 16.6l-5.1 2.9 1.3-5.9-4.5-4 6-.6Z" />
    </svg>
  );
}

export function IconCompras(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function IconFinanzas(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.3" />
      <path d="M6 6.5v11M18 6.5v11" />
    </svg>
  );
}


// ============================================================
// Subcategorias
// ============================================================

// --- Vivienda ---

export function IconAlquiler(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="9" r="3" />
      <path d="M10.2 11.2 19 20l-2 2-1.5-1.5L14 22l-2-2 1.5-1.5L12 17" />
    </svg>
  );
}

export function IconLuz(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13 3 5 14h6l-1 7 9-12h-6l1-6Z" />
    </svg>
  );
}

export function IconAgua(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s6 7 6 11.5A6 6 0 0 1 6 14.5C6 10 12 3 12 3Z" />
    </svg>
  );
}

export function IconGas(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-1-2.5-1-2.5.5 2-1 3-1 3-1-1 0-2.5-1-3.5-1 1-1.5 2.5-1 4" />
    </svg>
  );
}

export function IconInternet(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5a13 13 0 0 1 16 0" />
      <path d="M7 13a8.5 8.5 0 0 1 10 0" />
      <path d="M10 16.5a4 4 0 0 1 4 0" />
      <circle cx="12" cy="19.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLimpieza(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 4 6 12l-2 6 6-2 8-8Z" />
      <path d="M12.5 5.5 16 9" />
      <path d="M4 20h6" />
    </svg>
  );
}

export function IconLineaMovil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconFacturas(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}


// --- Transporte ---

export function IconLetraCoche(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M6 14h4" />
    </svg>
  );
}

export function IconCombustible(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
      <path d="M4 20h10" />
      <path d="M14 9h2l3 3v6a1.5 1.5 0 0 1-3 0v-2h-2" />
    </svg>
  );
}

export function IconMantenimiento(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />
    </svg>
  );
}

export function IconSeguroCoche(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v6c0 4.5-3 7-7 8.5-4-1.5-7-4-7-8.5V6l7-2.5Z" />
      <path d="M9.5 12.5 11.3 14.3 15 10.5" />
    </svg>
  );
}

export function IconTTP(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="15" rx="3" />
      <path d="M5 13h14" />
      <circle cx="8.5" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M9 21l1.5-3M15 21l-1.5-3" />
    </svg>
  );
}

export function IconTaxiUber(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 16V12l2-4h10l2 4v4" />
      <path d="M5 16h14" />
      <rect x="10" y="6" width="4" height="2.4" rx="0.5" />
      <circle cx="8" cy="17.5" r="1.4" />
      <circle cx="16" cy="17.5" r="1.4" />
    </svg>
  );
}

export function IconParking(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M10 16V7h3a3 3 0 0 1 0 6h-3" />
    </svg>
  );
}

export function IconPeaje(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20 18 6" />
      <circle cx="5.5" cy="19" r="1.6" />
      <path d="M9 8l3-3 5 5-3 3" />
    </svg>
  );
}


// --- Alimentación ---

export function IconSupermercado(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h2l1.5 9h9L18 9H8" />
      <circle cx="10" cy="19.5" r="1.2" />
      <circle cx="16" cy="19.5" r="1.2" />
    </svg>
  );
}

export function IconExpendedora(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
      <path d="M8.5 6h3v3h-3zM12.5 6h3v3h-3zM8.5 10.5h3v3h-3zM12.5 10.5h3v3h-3z" />
      <path d="M9 21v-2h6v2" />
    </svg>
  );
}

export function IconChino(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 9h14l-1.5 10a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 9Z" />
      <path d="M5 9 8 4h8l3 5" />
      <path d="M15 3v5M14 12v6" />
    </svg>
  );
}

export function IconComidaDomicilio(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6.5" cy="17.5" r="2.2" />
      <circle cx="17.5" cy="17.5" r="2.2" />
      <path d="M6.5 17.5h11l-2-9h-9z" />
      <path d="M8.5 8.5 7 4h9" />
    </svg>
  );
}

export function IconAlcohol(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3h8l-1.5 8a2.5 2.5 0 0 1-5 0L8 3Z" />
      <path d="M12 13v8M8.5 21h7" />
    </svg>
  );
}

export function IconRefresco(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 8h8l-1 12H9L8 8Z" />
      <path d="M7 8h10l-1-2H8L7 8Z" />
      <path d="M16 4l1.5-2" />
    </svg>
  );
}

export function IconCafe(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
      <path d="M16 10h1.5a2.2 2.2 0 0 1 0 4.4H16" />
      <path d="M8 6c0-1 1-1 1-2M11.5 6c0-1 1-1 1-2" />
    </svg>
  );
}

export function IconRestaurantes(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}


// --- Salud ---

export function IconSeguroMedico(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v6c0 4.5-3 7-7 8.5-4-1.5-7-4-7-8.5V6l7-2.5Z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

export function IconFarmacia(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="8.5" width="13" height="7" rx="3.5" transform="rotate(-35 12 12)" />
      <path d="M9.5 14.5 14.5 9.5" />
    </svg>
  );
}

export function IconPeluqueria(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="6.5" r="2.2" />
      <circle cx="7" cy="17.5" r="2.2" />
      <path d="M19 5 8.5 12 19 19" />
    </svg>
  );
}

export function IconHigiene(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s3 3 3 5.5a3 3 0 0 1-6 0C9 6 12 3 12 3Z" />
      <path d="M17.5 8.5c.6.6 1 1.3 1 2" />
    </svg>
  );
}

export function IconDentista(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4c-2.5 0-4.5 1.6-4.5 4.2 0 3 1 5 1.6 8.3.2 1.1 1.8 1.1 2-.2.3-1.8.4-3.3 1-3.3s.7 1.5 1 3.3c.2 1.3 1.8 1.3 2 .2.6-3.3 1.6-5.3 1.6-8.3C16.5 5.6 14.5 4 12 4Z" />
    </svg>
  );
}

export function IconFisioterapia(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="5" r="1.8" />
      <path d="M12 7v6" />
      <path d="M12 9 7 12M12 9l5 3" />
      <path d="M12 13 9 20M12 13l3 7" />
    </svg>
  );
}


// --- Deporte ---

export function IconGimnasio(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h2M19 12h2M5 9v6M19 9v6" />
      <path d="M7 12h10" />
      <path d="M7 8v8M17 8v8" />
    </svg>
  );
}

export function IconRunning(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18c2 0 2.5-1.5 4-1.5s1.5 1.5 3.5 1.5 2-2 4-2 2 1 3.5 1" />
      <path d="M6 18V9l5-2 2 3h4" />
      <circle cx="14" cy="4" r="1.6" />
    </svg>
  );
}

export function IconMaterialDeportivo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 9h10v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M4 12h3M17 12h3" />
    </svg>
  );
}

export function IconClasesPadel(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="5" />
      <path d="M8.5 5.5h3M8.5 8h3M8.5 10.5h3M6.5 8h7M13.6 11.6 20 18" />
    </svg>
  );
}

export function IconPartidoPadel(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M9 9.5c1 1 5 1 6 0M9 14.5c1-1 5-1 6 0" />
    </svg>
  );
}

export function IconCrossfit(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4.2" />
      <path d="M9.5 11.5 7 20h10l-2.5-8.5" />
    </svg>
  );
}


// --- Ocio ---

export function IconViajes(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 13l7-2 5-7 2 1-3 6.5 6 1-1 2-6.5.5-3 4-2-.5 1.5-3.5L3 13Z" />
    </svg>
  );
}

export function IconCines(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8 6 4h3l-1.5 4h3L12 4h3l-1.5 4H17l2-4 1 .5-2 3.5H4L2.5 8.5 4 8Z" />
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
    </svg>
  );
}

export function IconConciertos(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="16" cy="16" r="2.2" />
      <path d="M9 18V5l9-1v11" />
    </svg>
  );
}

export function IconEspectaculos(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </svg>
  );
}

export function IconActividades(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M15 9l-4.5 2-1.5 4.5 4.5-2z" />
    </svg>
  );
}

export function IconSuscripciones(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" />
      <path d="M17.7 3.5v3.4h-3.4M6.3 20.5v-3.4h3.4" />
    </svg>
  );
}

export function IconVideojuegos(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9h5.5a5 5 0 0 1 0 10H8l-3-3.5V9Z" />
      <path d="M8 11.5v3M6.5 13h3" />
      <circle cx="15.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="15" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconApuestasLoteria(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLibros(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6c-1.5-1-4-1.5-6-1v13c2-.5 4.5 0 6 1 1.5-1 4-1.5 6-1V5c-2-.5-4.5 0-6 1Z" />
      <path d="M12 6v13" />
    </svg>
  );
}

export function IconDiscotecas(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="10" r="6" />
      <path d="M6.5 7.5h11M6 10h12M6.5 12.5h11M9 5l-1 10M15 5l1 10M12 4v12" />
      <path d="M12 16v5" />
    </svg>
  );
}


// --- Compras ---

export function IconRopa(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 12 6l3-2 4 3-2.5 3L15 9v11H9V9L7.5 10 5 7l4-3Z" />
    </svg>
  );
}

export function IconElectronica(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function IconMuebles(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" />
      <path d="M4 12h16v4H4z" />
      <path d="M5 16v3M19 16v3" />
    </svg>
  );
}

export function IconDecoracion(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="M4 17l5-5 3.5 3.5L16 11l4 5" />
    </svg>
  );
}

export function IconRegalos(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M4 13h16" />
      <path d="M12 9v11" />
      <path d="M12 9c-1.5 0-4-1-4-3s2-3 4 0c2-3 4-1 4 0s-2.5 3-4 3Z" />
    </svg>
  );
}

export function IconJuguetes(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="8.5" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}


// --- Finanzas ---

export function IconInversiones(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18 9 12l4 3 7-9" />
      <path d="M16 6h4v4" />
    </svg>
  );
}

export function IconEfectivo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="4.5" />
      <circle cx="15" cy="15" r="4.5" />
      <path d="M8 8v.01M15 15v.01" />
    </svg>
  );
}

export function IconAhorro(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12c0-3 2.5-5.5 6-5.5s6.5 2 7 4.5h1.5v3H18l-1 2h-2v-1.5H9V18H7v-2c-1.2-.6-2-1.8-2-3.2Z" />
      <circle cx="9" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M9 6.5 8 4" />
    </svg>
  );
}

export function IconImpuestos(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 15 15 9" />
      <circle cx="9.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSalario(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h13l3 3v7H4V8Z" />
      <circle cx="14" cy="13.5" r="2.3" />
      <path d="M4 8l4-4h6" />
    </svg>
  );
}

export function IconPagaExtra(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="13.5" r="6.5" />
      <path d="M8.5 13.5 10 15l3.5-3.5" />
      <path d="M17 3.5v3.4h-3.4" strokeLinecap="round" />
      <path d="M17 3.5c-2 0-4 1-5 3" />
    </svg>
  );
}

export function IconVariable(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16 8 8l4 8 4-11 4 9" />
    </svg>
  );
}

export function IconBeneficios(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 20 10 10l4 5 5-10" />
      <path d="M15 4h4v4" />
    </svg>
  );
}

export function IconIngresoExtra(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

