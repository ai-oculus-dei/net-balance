import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Card, CardTitle } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Cargando } from '../ui/Spinner';
import { IconAlerta, IconCheck, IconChevronDown, IconMedidor } from '../icons/UiIcons';
import { colorCategorico } from '../charts/colorsCategoricos';
import { ObjetivoCarteraForm } from './ObjetivoCarteraForm';
import { formatearImporte } from '../../lib/finance/formato';
import {
  ETIQUETA_CARTERA,
  estadoObjetivo,
  margenObjetivo,
  pesoPorEtiqueta,
  type ObjetivoCartera,
  type UnidadCartera,
} from '../../lib/finance/objetivosCartera';
import type { Theme } from '../../lib/theme/ThemeProvider';

interface RepartoCarteraCardProps {
  unidades: UnidadCartera[];
  objetivos: ObjetivoCartera[];
  loading: boolean;
  error: string | null;
  theme: Theme;
  onGuardar: (objetivo: ObjetivoCartera) => Promise<void>;
}

const pct = (v: number, d = 1) => `${formatearImporte(v, d)} %`;
const RADIAN = Math.PI / 180;
const COLOR_SIN_ASIGNAR = 'var(--line-strong)';

interface EtiquetaObjetivoProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  payload?: { objetivo: number | null; sinAsignar?: boolean; color: string };
}

// % objetivo escrito por fuera del anillo exterior, en el color de su activo.
function EtiquetaObjetivo({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, payload }: EtiquetaObjetivoProps) {
  if (!payload || payload.sinAsignar || payload.objetivo === null || payload.objetivo < 3) return null;
  const r = outerRadius + 14;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill={payload.color}
      fontSize={10.5}
      fontWeight={600}
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      textAnchor={x > cx + 2 ? 'start' : x < cx - 2 ? 'end' : 'middle'}
      dominantBaseline="central"
    >
      {`${formatearImporte(payload.objetivo, payload.objetivo % 1 === 0 ? 0 : 1)}%`}
    </text>
  );
}

export function RepartoCarteraCard({ unidades, objetivos, loading, error, theme, onGuardar }: RepartoCarteraCardProps) {
  const [editando, setEditando] = useState<UnidadCartera | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const objetivoPorClave = useMemo(() => new Map(objetivos.map((o) => [o.clave, o])), [objetivos]);

  const filas = useMemo(
    () =>
      unidades.map((u, i) => {
        const o = objetivoPorClave.get(u.clave);
        const objetivo = o?.objetivoPct ?? null;
        return {
          ...u,
          color: colorCategorico(i, theme),
          etiqueta: o?.etiqueta ?? null,
          objetivo,
          estado: objetivo === null ? null : estadoObjetivo(u.pct, objetivo),
        };
      }),
    [unidades, objetivoPorClave, theme]
  );

  const sumaObjetivos = filas.reduce((s, f) => s + (f.objetivo ?? 0), 0);
  const fuera = filas.filter((f) => f.estado !== null && f.estado !== 'en_rango').length;
  const conObjetivo = filas.some((f) => f.objetivo !== null);
  const peso = pesoPorEtiqueta(unidades, objetivos);

  // Anillo exterior: el objetivo de cada unidad, en el mismo orden (y color) que el interior,
  // mas un tramo gris con lo que quede sin asignar hasta el 100 %.
  const anilloObjetivo = [
    ...filas.map((f) => ({ clave: f.clave, valor: f.objetivo ?? 0, objetivo: f.objetivo, color: f.color })),
    ...(sumaObjetivos < 100 ? [{ clave: '__sin_asignar', valor: 100 - sumaObjetivos, objetivo: null, color: COLOR_SIN_ASIGNAR, sinAsignar: true }] : []),
  ];

  return (
    <Card>
      <CardTitle icon={<IconMedidor />} className="mb-1">
        Reparto vs objetivo
      </CardTitle>
      <p className="text-xs text-muted mb-2">Interior: peso actual · Exterior: objetivo. Abre el desplegable y toca un activo para fijar su objetivo.</p>

      {loading ? (
        <Cargando />
      ) : error ? (
        <p className="notice">
          <IconAlerta />
          <span>
            No se han podido cargar los objetivos ({error}). Si es la primera vez, falta crear la tabla en Supabase:
            ejecuta <span className="font-mono text-fg">supabase/migrations/0021_objetivos_cartera.sql</span>.
          </span>
        </p>
      ) : unidades.length === 0 ? (
        <p className="empty">Todavía no tienes posiciones.</p>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={filas}
                  dataKey="pct"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={1.5}
                  cornerRadius={3}
                  stroke="var(--card-solid)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {filas.map((f) => (
                    <Cell key={f.clave} fill={f.color} />
                  ))}
                </Pie>
                {conObjetivo && (
                  <Pie
                    data={anilloObjetivo}
                    dataKey="valor"
                    cx="50%"
                    cy="50%"
                    innerRadius={88}
                    outerRadius={96}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={1}
                    stroke="var(--card-solid)"
                    strokeWidth={1.5}
                    isAnimationActive={false}
                    label={EtiquetaObjetivo}
                    labelLine={false}
                  >
                    {anilloObjetivo.map((a) => (
                      <Cell key={a.clave} fill={a.color} fillOpacity={'sinAsignar' in a ? 0.35 : 0.55} />
                    ))}
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {!conObjetivo ? (
                <span className="kpi-label max-w-[90px] leading-tight">sin objetivos</span>
              ) : fuera === 0 ? (
                <>
                  <IconCheck className="w-6 h-6 text-ok" />
                  <span className="kpi-label !text-[9px] mt-1">en rango</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[24px] font-semibold leading-none text-warn">{fuera}</span>
                  <span className="kpi-label !text-[9px] mt-1 max-w-[80px] leading-tight">fuera de objetivo</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDetalleAbierto((v) => !v)}
            aria-expanded={detalleAbierto}
            className="w-full flex items-center justify-between gap-3 py-2.5 border-t border-line text-left cursor-pointer"
          >
            <span className="text-sm font-medium">
              Activos y objetivos <span className="font-mono text-[11.5px] text-muted">({filas.length})</span>
            </span>
            <IconChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${detalleAbierto ? 'rotate-180' : ''}`} />
          </button>

          {detalleAbierto && (
          <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11.5px] mb-2">
            <span className="text-muted">
              Núcleo <span className="text-fg">{pct(peso.nucleo)}</span> · Satélite <span className="text-fg">{pct(peso.satelite)}</span>
            </span>
            {conObjetivo && (
              <span className={Math.abs(sumaObjetivos - 100) < 0.01 ? 'text-muted' : 'text-warn'}>
                objetivos: {pct(sumaObjetivos)}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {filas.map((f) => {
              const fueraDeRango = f.estado === 'por_encima' || f.estado === 'por_debajo';
              return (
                <button
                  key={f.clave}
                  type="button"
                  onClick={() => setEditando(f)}
                  className="row-item w-full text-left cursor-pointer !py-2.5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: f.color, boxShadow: `0 0 6px ${f.color}` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-sm">{f.nombre}</span>
                      {f.etiqueta && (
                        <span className={`tag shrink-0 ${f.etiqueta === 'nucleo' ? '!text-cyan' : '!text-violet'}`}>
                          {ETIQUETA_CARTERA[f.etiqueta].toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span className="block font-mono text-[11px] text-muted mt-0.5">
                      {f.objetivo === null
                        ? 'sin objetivo'
                        : `obj ${pct(f.objetivo)} ±${formatearImporte(margenObjetivo(f.objetivo), 1)}`}
                      {f.esBloque ? ` · ${f.numActivos} activos` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-mono text-sm font-semibold ${fueraDeRango ? 'text-warn' : ''}`}>{pct(f.pct)}</span>
                    {f.estado === 'en_rango' && <IconCheck className="w-4 h-4 text-ok" aria-label="En rango" />}
                    {fueraDeRango && (
                      <IconAlerta
                        className="w-4 h-4 text-warn"
                        aria-label={f.estado === 'por_encima' ? 'Por encima del objetivo' : 'Por debajo del objetivo'}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          </>
          )}
        </>
      )}

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Objetivo en la cartera">
        {editando && (
          <ObjetivoCarteraForm
            unidad={editando}
            inicial={objetivoPorClave.get(editando.clave)}
            onSubmit={async (o) => {
              await onGuardar(o);
              setEditando(null);
            }}
            onCancel={() => setEditando(null)}
          />
        )}
      </Modal>
    </Card>
  );
}
