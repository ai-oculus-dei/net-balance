// Tipos manuales alineados con supabase/migrations/0001_schema.sql.
// Regenerar/ajustar aqui si el esquema cambia (no hay CLI de Supabase logueado en este entorno
// para `supabase gen types typescript` — ver TODO.md).
//
// El cliente de Supabase (lib/supabase/client.ts) se crea SIN el generico `Database`: en esta
// combinacion de versiones (supabase-js 2.112 + TypeScript 6.0), pasar un `Database` con varias
// tablas hace que postgrest-js resuelva `Schema extends GenericSchema` a `never` de forma
// intermitente (reproducido de forma aislada, ver historial), lo que rompe `.insert()`/`.update()`
// silenciosamente. En su lugar, cada funcion en `queries/` tipa a mano el resultado con las
// interfaces de abajo, que son la fuente de verdad de los tipos de fila.

export type Visibilidad = 'privado' | 'compartido';
export type TipoObjetivo = 'acumulativo' | 'recurrente';
export type ModoAportacion = 'automatico' | 'manual';

export interface Profile {
  id: string;
  nombre: string;
  created_at: string;
}

export interface ProfileInsert {
  id: string;
  nombre: string;
  created_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  nombre?: string;
  created_at?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Subcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
  es_ingreso_real: boolean;
  es_gasto_fijo: boolean;
}

export interface Movimiento {
  id: string;
  fecha: string;
  nombre: string;
  importe: number;
  subcategoria_id: number;
  usuario_id: string;
  creado_por: string;
  visibilidad: Visibilidad;
  nota: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovimientoInsert {
  id?: string;
  fecha?: string;
  nombre: string;
  importe: number;
  subcategoria_id: number;
  usuario_id: string;
  creado_por: string;
  visibilidad?: Visibilidad;
  nota?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MovimientoUpdate {
  id?: string;
  fecha?: string;
  nombre?: string;
  importe?: number;
  subcategoria_id?: number;
  usuario_id?: string;
  creado_por?: string;
  visibilidad?: Visibilidad;
  nota?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ObjetivoAhorro {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo: TipoObjetivo;
  meta: number | null;
  fecha_objetivo: string | null;
  modo_aportacion: ModoAportacion;
  porcentaje: number | null;
  acumulado: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjetivoAhorroInsert {
  id?: string;
  usuario_id: string;
  nombre: string;
  tipo: TipoObjetivo;
  meta?: number | null;
  fecha_objetivo?: string | null;
  modo_aportacion: ModoAportacion;
  porcentaje?: number | null;
  acumulado?: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ObjetivoAhorroUpdate {
  id?: string;
  usuario_id?: string;
  nombre?: string;
  tipo?: TipoObjetivo;
  meta?: number | null;
  fecha_objetivo?: string | null;
  modo_aportacion?: ModoAportacion;
  porcentaje?: number | null;
  acumulado?: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AportacionObjetivo {
  id: string;
  objetivo_id: string;
  anio_mes: string;
  importe_calculado: number;
  importe_aplicado: number;
  created_at: string;
}

export interface AportacionObjetivoInsert {
  id?: string;
  objetivo_id: string;
  anio_mes: string;
  importe_calculado: number;
  importe_aplicado: number;
  created_at?: string;
}

export interface AportacionObjetivoUpdate {
  id?: string;
  objetivo_id?: string;
  anio_mes?: string;
  importe_calculado?: number;
  importe_aplicado?: number;
  created_at?: string;
}

