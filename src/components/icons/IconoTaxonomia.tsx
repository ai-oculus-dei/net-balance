import type { SVGProps } from 'react';
import {
  IconVivienda,
  IconTransporte,
  IconAlimentacion,
  IconSalud,
  IconDeporte,
  IconOcio,
  IconCompras,
  IconFinanzas,
  IconAlquiler,
  IconLuz,
  IconAgua,
  IconGas,
  IconInternet,
  IconLimpieza,
  IconLineaMovil,
  IconFacturas,
  IconLetraCoche,
  IconCombustible,
  IconMantenimiento,
  IconSeguroCoche,
  IconTTP,
  IconTaxiUber,
  IconParking,
  IconPeaje,
  IconSupermercado,
  IconExpendedora,
  IconChino,
  IconComidaDomicilio,
  IconAlcohol,
  IconRefresco,
  IconCafe,
  IconRestaurantes,
  IconSeguroMedico,
  IconFarmacia,
  IconPeluqueria,
  IconHigiene,
  IconDentista,
  IconFisioterapia,
  IconGimnasio,
  IconRunning,
  IconMaterialDeportivo,
  IconClasesPadel,
  IconPartidoPadel,
  IconCrossfit,
  IconViajes,
  IconCines,
  IconConciertos,
  IconEspectaculos,
  IconActividades,
  IconSuscripciones,
  IconVideojuegos,
  IconApuestasLoteria,
  IconLibros,
  IconDiscotecas,
  IconRopa,
  IconElectronica,
  IconMuebles,
  IconDecoracion,
  IconRegalos,
  IconJuguetes,
  IconInversiones,
  IconEfectivo,
  IconAhorro,
  IconImpuestos,
  IconSalario,
  IconPagaExtra,
  IconVariable,
  IconBeneficios,
  IconIngresoExtra,
} from './CategoriaIcons';

type IconProps = SVGProps<SVGSVGElement>;
type IconComponent = (props: IconProps) => ReturnType<typeof IconVivienda>;

// Las categorias/subcategorias no tienen un slug propio en la base de datos, solo `nombre` —
// asi que el icono se busca por ese mismo nombre (ver seccion "categorias"/"subcategorias" del
// esquema, 0001_schema.sql).
const ICONO_CATEGORIA: Record<string, IconComponent> = {
  Vivienda: IconVivienda,
  Transporte: IconTransporte,
  Alimentación: IconAlimentacion,
  Salud: IconSalud,
  Deporte: IconDeporte,
  Ocio: IconOcio,
  Compras: IconCompras,
  Finanzas: IconFinanzas,
};

const ICONO_SUBCATEGORIA: Record<string, IconComponent> = {
  // Vivienda
  Alquiler: IconAlquiler,
  Luz: IconLuz,
  Agua: IconAgua,
  Gas: IconGas,
  Internet: IconInternet,
  Limpieza: IconLimpieza,
  'Línea Móvil': IconLineaMovil,
  Facturas: IconFacturas,
  // Transporte
  'Letra Coche': IconLetraCoche,
  Combustible: IconCombustible,
  Mantenimiento: IconMantenimiento,
  'Seguro Coche': IconSeguroCoche,
  TTP: IconTTP,
  'Taxi/Uber': IconTaxiUber,
  Parking: IconParking,
  Peaje: IconPeaje,
  // Alimentación
  Supermercado: IconSupermercado,
  Expendedora: IconExpendedora,
  Chino: IconChino,
  'Comida a Domicilio': IconComidaDomicilio,
  Alcohol: IconAlcohol,
  Refresco: IconRefresco,
  Café: IconCafe,
  Restaurantes: IconRestaurantes,
  // Salud
  'Seguro Médico': IconSeguroMedico,
  Farmacia: IconFarmacia,
  Peluquería: IconPeluqueria,
  Higiene: IconHigiene,
  Dentista: IconDentista,
  Fisioterapia: IconFisioterapia,
  // Deporte
  Gimnasio: IconGimnasio,
  Running: IconRunning,
  'Material Deportivo': IconMaterialDeportivo,
  'Clases de Padel': IconClasesPadel,
  'Partido Padel': IconPartidoPadel,
  Crossfit: IconCrossfit,
  // Ocio
  Viajes: IconViajes,
  Cines: IconCines,
  Conciertos: IconConciertos,
  Espectáculos: IconEspectaculos,
  Actividades: IconActividades,
  Suscripciones: IconSuscripciones,
  Videojuegos: IconVideojuegos,
  'Apuestas/Lotería': IconApuestasLoteria,
  Libros: IconLibros,
  Discotecas: IconDiscotecas,
  // Compras
  Ropa: IconRopa,
  Electrónica: IconElectronica,
  Muebles: IconMuebles,
  Decoración: IconDecoracion,
  Regalos: IconRegalos,
  Juguetes: IconJuguetes,
  // Finanzas
  Inversiones: IconInversiones,
  Efectivo: IconEfectivo,
  Ahorro: IconAhorro,
  Impuestos: IconImpuestos,
  Salario: IconSalario,
  'Paga Extra': IconPagaExtra,
  Variable: IconVariable,
  Beneficios: IconBeneficios,
  'Ingreso Extra': IconIngresoExtra,
};

interface IconoTaxonomiaProps {
  nombre: string;
  className?: string;
}

// Renderiza el icono de una categoria/subcategoria por su nombre — si el nombre no tiene icono
// asignado (p.ej. una futura categoria nueva) no rompe: simplemente no pinta nada.
export function IconoCategoria({ nombre, className = 'w-4 h-4 shrink-0' }: IconoTaxonomiaProps) {
  const Icono = ICONO_CATEGORIA[nombre];
  if (!Icono) return null;
  return <Icono className={className} aria-hidden="true" />;
}

export function IconoSubcategoria({ nombre, className = 'w-4 h-4 shrink-0' }: IconoTaxonomiaProps) {
  const Icono = ICONO_SUBCATEGORIA[nombre];
  if (!Icono) return null;
  return <Icono className={className} aria-hidden="true" />;
}
