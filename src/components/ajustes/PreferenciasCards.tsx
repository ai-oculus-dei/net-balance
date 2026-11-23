import type { ReactNode } from 'react';
import { Card, CardTitle } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { IconCampana, IconDeslizadores, IconOjoTachado } from '../icons/UiIcons';
import { ETIQUETA_TIPO } from '../../lib/finance/patrimonio';
import { usePreferencias } from '../../lib/preferencias/usePreferencias';
import type { FiltroTipoPatrimonio, OrdenPatrimonio } from '../../lib/preferencias/preferencias';
import type { TipoPosicionPatrimonio } from '../../lib/supabase/database.types';

function FilaInterruptor({
  titulo,
  detalle,
  icono,
  checked,
  onChange,
}: {
  titulo: string;
  detalle: string;
  icono?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 border-t border-dashed border-line first:border-0 cursor-pointer">
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm">
          {icono}
          {titulo}
        </span>
        <span className="block text-xs text-muted leading-snug mt-0.5">{detalle}</span>
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// Configuracion con la que se abre Patrimonio y "Ocultar totales".
export function ConfiguracionPorDefectoCard() {
  const { preferencias, cambiar } = usePreferencias();
  return (
    <Card>
      <CardTitle icon={<IconDeslizadores />} className="mb-1">
        Configuración por defecto
      </CardTitle>
      <p className="text-xs text-muted leading-relaxed mb-3">Cómo se abre Patrimonio. Se guarda en este dispositivo.</p>

      <div className="flex flex-col gap-3">
        <Segmented
          full
          ariaLabel="P/L por defecto"
          value={preferencias.patrimonioModoPnL}
          onChange={(v) => cambiar({ patrimonioModoPnL: v })}
          options={[
            { value: 'total', label: 'P/L total' },
            { value: 'diario', label: 'P/L diario' },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Tipo de activo"
            value={preferencias.patrimonioFiltroTipo}
            onChange={(e) => cambiar({ patrimonioFiltroTipo: e.target.value as FiltroTipoPatrimonio })}
          >
            <option value="todos">Todos</option>
            {(Object.keys(ETIQUETA_TIPO) as TipoPosicionPatrimonio[]).map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </Select>
          <Select
            label="Ordenar por"
            value={preferencias.patrimonioOrden}
            onChange={(e) => cambiar({ patrimonioOrden: e.target.value as OrdenPatrimonio })}
          >
            <option value="valor">Valor total</option>
            <option value="variacion">Variación hoy (%)</option>
          </Select>
        </div>
        <div className="mt-1">
          <FilaInterruptor
            titulo="Ocultar totales"
            detalle="Asteriscos en lugar del patrimonio total y el P/L total. También con el ojo de la tarjeta."
            icono={<IconOjoTachado className="w-4 h-4 text-cyan" />}
            checked={preferencias.ocultarTotales}
            onChange={(v) => cambiar({ ocultarTotales: v })}
          />
        </div>
      </div>
    </Card>
  );
}

export function AvisosCard() {
  const { preferencias, cambiar } = usePreferencias();
  return (
    <Card>
      <CardTitle icon={<IconCampana />} className="mb-1">
        Avisos
      </CardTitle>
      <FilaInterruptor
        titulo="Objetivos de cartera"
        detalle="Activos fuera del porcentaje objetivo de Patrimonio."
        checked={preferencias.avisoCartera}
        onChange={(v) => cambiar({ avisoCartera: v })}
      />
      <FilaInterruptor
        titulo="Objetivos de gasto"
        detalle="Líneas del mes a las que les queda menos de un 10 %."
        checked={preferencias.avisoGastos}
        onChange={(v) => cambiar({ avisoGastos: v })}
      />
    </Card>
  );
}
