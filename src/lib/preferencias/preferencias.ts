import type { TipoPosicionPatrimonio } from '../supabase/database.types';

export type FiltroTipoPatrimonio = 'todos' | TipoPosicionPatrimonio;
export type OrdenPatrimonio = 'valor' | 'variacion';
export type ModoPnL = 'total' | 'diario';

// Preferencias de Ajustes. Se guardan en el dispositivo (localStorage), igual que el tema.
export interface Preferencias {
  // Configuracion con la que se abre Patrimonio.
  patrimonioModoPnL: ModoPnL;
  patrimonioFiltroTipo: FiltroTipoPatrimonio;
  patrimonioOrden: OrdenPatrimonio;
  // Asteriscos en vez de importes en las tarjetas de total de Patrimonio (boton del ojo).
  ocultarTotales: boolean;
  // Avisos de arriba de la pantalla.
  avisoCartera: boolean;
  avisoGastos: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  patrimonioModoPnL: 'total',
  patrimonioFiltroTipo: 'todos',
  patrimonioOrden: 'valor',
  ocultarTotales: false,
  avisoCartera: true,
  avisoGastos: true,
};

export const STORAGE_KEY_PREFERENCIAS = 'net-balance-preferencias';

export function leerPreferencias(): Preferencias {
  try {
    const guardadas = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFERENCIAS) ?? '{}') as Partial<Preferencias>;
    return { ...PREFERENCIAS_POR_DEFECTO, ...guardadas };
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export function escribirPreferencias(p: Preferencias): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFERENCIAS, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado): las preferencias duran lo que dure la sesion.
  }
}

// Lo que se muestra en lugar de un importe con "Ocultar totales".
export const IMPORTE_OCULTO = '******';
