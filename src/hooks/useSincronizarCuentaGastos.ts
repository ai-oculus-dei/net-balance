import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../lib/auth/useAuth';
import { useAnclasPeriodo } from './useAnclasPeriodo';
import { useMovimientos } from './useMovimientos';
import { resolverPeriodoActual } from '../lib/finance/periodos';
import { balanceNetoDelMes } from '../lib/finance/metricas';
import { esCuentaGastos, NOMBRE_CUENTA_GASTOS } from '../lib/finance/patrimonio';
import { toIsoDate } from '../lib/finance/fechas';
import { actualizarPosicionPatrimonio, crearPosicionPatrimonio } from '../lib/supabase/queries/patrimonio';
import { emitPatrimonioChanged } from '../lib/events/patrimonioBus';
import type { PosicionPatrimonio } from '../lib/supabase/database.types';

const EPSILON_EUR = 0.005;

// Mantiene siempre una posicion de Patrimonio (Cuenta Corriente "Gastos") con el mismo valor que
// el balance neto del mes en curso de Movimientos (todo lo ingresado menos todo lo gastado, ver
// balanceNetoDelMes) — la crea si no existe, y la actualiza cada vez que cambian los movimientos
// del periodo en curso. Montado una sola vez de forma global (AppShell), no por pantalla.
export function useSincronizarCuentaGastos(posicionesPatrimonio: PosicionPatrimonio[], loadingPatrimonio: boolean) {
  const { session } = useAuth();
  const { anclas, loading: loadingAnclas } = useAnclasPeriodo();
  const rango = useMemo(() => resolverPeriodoActual(anclas, new Date()).rango, [anclas]);
  const { movimientos, loading: loadingMovimientos } = useMovimientos(rango);
  const sincronizando = useRef(false);

  useEffect(() => {
    if (!session || loadingAnclas || loadingMovimientos || loadingPatrimonio || sincronizando.current) return;

    const balance = balanceNetoDelMes(movimientos);
    const existente = posicionesPatrimonio.find((p) => p.activa && esCuentaGastos(p));

    if (existente) {
      const yaSincronizada =
        Math.abs(existente.precio_actual_unitario! - balance) <= EPSILON_EUR &&
        Math.abs(existente.precio_compra_unitario - balance) <= EPSILON_EUR;
      if (yaSincronizada) return;

      sincronizando.current = true;
      actualizarPosicionPatrimonio(existente.id, { precio_compra_unitario: balance, precio_actual_unitario: balance })
        .then(() => emitPatrimonioChanged())
        .finally(() => {
          sincronizando.current = false;
        });
      return;
    }

    sincronizando.current = true;
    crearPosicionPatrimonio({
      usuario_id: session.user.id,
      tipo: 'cuenta_corriente',
      nombre: NOMBRE_CUENTA_GASTOS,
      ticker: null,
      mercado: null,
      moneda: 'EUR',
      cantidad: 1,
      precio_compra_unitario: balance,
      precio_actual_unitario: balance,
      tae: null,
      fecha_compra: toIsoDate(new Date()),
    })
      .then(() => emitPatrimonioChanged())
      .finally(() => {
        sincronizando.current = false;
      });
  }, [session, loadingAnclas, loadingMovimientos, loadingPatrimonio, movimientos, posicionesPatrimonio]);
}
