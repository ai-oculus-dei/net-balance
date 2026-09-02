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
  es_ahorro: boolean;
  es_inversion: boolean;
  es_traspaso: boolean;
  es_ingreso_condicional: boolean;
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
  es_primer_dia_mes: boolean;
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
  es_primer_dia_mes?: boolean;
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
  es_primer_dia_mes?: boolean;
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
  movimiento_id: string | null;
  importe: number;
  created_at: string;
  updated_at: string;
}

export interface AportacionObjetivoInsert {
  id?: string;
  objetivo_id: string;
  movimiento_id?: string | null;
  importe: number;
  created_at?: string;
  updated_at?: string;
}

export interface AportacionObjetivoUpdate {
  id?: string;
  objetivo_id?: string;
  movimiento_id?: string | null;
  importe?: number;
  created_at?: string;
  updated_at?: string;
}

export type TipoPosicionPatrimonio =
  | 'stock'
  | 'etf'
  | 'fondo_indexado'
  | 'fondo_monetario'
  | 'cuenta_remunerada'
  | 'cuenta_ahorro'
  | 'commodity'
  | 'cuenta_corriente'
  | 'criptomoneda';

export interface PosicionPatrimonio {
  id: string;
  usuario_id: string;
  tipo: TipoPosicionPatrimonio;
  nombre: string;
  ticker: string | null;
  mercado: string | null;
  cantidad: number;
  precio_compra_unitario: number;
  // null cuando la posicion tiene una TAE: el valor actual se calcula por formula (ver
  // src/lib/finance/patrimonio.ts) en vez de guardarse a mano. Nunca los dos a null a la vez.
  precio_actual_unitario: number | null;
  tae: number | null;
  // Mensaje corto de la Edge Function actualizar-precios-patrimonio cuando no consigue
  // actualizar el precio; null en cuanto vuelve a funcionar. Ver src/lib/finance/patrimonio.ts.
  error_precio: string | null;
  fecha_compra: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface PosicionPatrimonioInsert {
  id?: string;
  usuario_id: string;
  tipo: TipoPosicionPatrimonio;
  nombre: string;
  ticker?: string | null;
  mercado?: string | null;
  cantidad?: number;
  precio_compra_unitario: number;
  precio_actual_unitario?: number | null;
  tae?: number | null;
  error_precio?: string | null;
  fecha_compra?: string;
  activa?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PosicionPatrimonioUpdate {
  id?: string;
  usuario_id?: string;
  tipo?: TipoPosicionPatrimonio;
  nombre?: string;
  ticker?: string | null;
  mercado?: string | null;
  cantidad?: number;
  precio_compra_unitario?: number;
  precio_actual_unitario?: number | null;
  tae?: number | null;
  error_precio?: string | null;
  fecha_compra?: string;
  activa?: boolean;
  created_at?: string;
  updated_at?: string;
}

// patrimonio_historico solo se escribe desde el RPC generar_snapshot_patrimonio (RLS no
// permite insert/update/delete al cliente) — no hace falta un tipo *Insert para esta tabla.
export interface PatrimonioHistorico {
  id: string;
  posicion_id: string;
  fecha: string;
  valor_total: number;
  created_at: string;
}

// Fila unica (id siempre true): solo la escribe la Edge Function actualizar-precios-patrimonio
// (service_role) — el cliente solo la lee, RLS no permite insert/update/delete.
export interface PatrimonioPreciosActualizacion {
  id: true;
  actualizado_en: string;
}

