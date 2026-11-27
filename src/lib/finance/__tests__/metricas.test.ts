import { describe, expect, it } from 'vitest';
import { balanceNetoDelMes } from '../metricas';
import type { Movimiento } from '../../supabase/database.types';

function mov(subcategoria_id: number, importe: number): Movimiento {
  return {
    id: `${subcategoria_id}-${importe}-${Math.random()}`,
    fecha: '2026-02-10',
    nombre: 'x',
    importe,
    subcategoria_id,
    usuario_id: 'u1',
    creado_por: 'u1',
    visibilidad: 'privado',
    nota: null,
    es_primer_dia_mes: false,
    created_at: '2026-02-10',
    updated_at: '2026-02-10',
  };
}

describe('balanceNetoDelMes', () => {
  it('suma todos los movimientos con signo, incluidos traspasos', () => {
    const movimientos = [mov(1, 2000), mov(4, -800), mov(2, -300), mov(5, -50)];
    expect(balanceNetoDelMes(movimientos)).toBe(850);
  });
});
