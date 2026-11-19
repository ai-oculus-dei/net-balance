import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { FormError } from '../ui/FormActions';
import { IconCheck, IconDescargar } from '../icons/UiIcons';
import { useTaxonomia } from '../../hooks/useTaxonomia';
import { useProfiles } from '../../hooks/useProfiles';
import { toIsoDate } from '../../lib/finance/fechas';
import { valoresDiariosPorActivo } from '../../lib/finance/patrimonio';
import { precioDiarioDesdeFila, ventaLoteDesdeFila } from '../../lib/finance/historicoPrecioActivo';
import { fetchMovimientosParaExportar } from '../../lib/supabase/queries/movimientos';
import {
  fetchPatrimonioHistorico,
  fetchPosicionesPatrimonio,
  fetchPreciosHistoricoActivo,
} from '../../lib/supabase/queries/patrimonio';
import { fetchVentasPatrimonioLotes } from '../../lib/supabase/queries/ventas';
import { csvMovimientos, csvPatrimonio } from '../../lib/export/csv';
import { compartirArchivos, descargarArchivos, type ArchivoExportado } from '../../lib/export/descargar';

type QueExportar = 'movimientos' | 'patrimonio' | 'ambos';

function diaSiguiente(fechaIso: string): string {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return toIsoDate(new Date(a, m - 1, d + 1));
}

// Formulario de Ajustes -> Exportar: rango de fechas (ambas inclusive) y tres botones para
// descargar el CSV de movimientos, el de patrimonio (valor diario de cada activo) o los dos.
export function ExportarForm() {
  const hoy = new Date();
  const [desde, setDesde] = useState(toIsoDate(new Date(hoy.getFullYear(), 0, 1)));
  const [hasta, setHasta] = useState(toIsoDate(hoy));
  const [exportando, setExportando] = useState<QueExportar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<ArchivoExportado[] | null>(null);
  const { categorias, subcategorias } = useTaxonomia();
  const { profiles } = useProfiles();

  async function generarMovimientos(): Promise<{ archivo: ArchivoExportado; resumen: string }> {
    const movimientos = await fetchMovimientosParaExportar({ desde, hasta: diaSiguiente(hasta) });
    return {
      archivo: {
        nombre: `movimientos_${desde}_a_${hasta}.csv`,
        contenido: csvMovimientos(movimientos, subcategorias, categorias, profiles),
      },
      resumen: `${movimientos.length} movimientos`,
    };
  }

  async function generarPatrimonio(): Promise<{ archivo: ArchivoExportado; resumen: string }> {
    const [posiciones, historico, precios, ventas] = await Promise.all([
      fetchPosicionesPatrimonio(),
      fetchPatrimonioHistorico(),
      fetchPreciosHistoricoActivo(),
      fetchVentasPatrimonioLotes(),
    ]);
    const valores = valoresDiariosPorActivo(
      posiciones,
      historico,
      precios.map(precioDiarioDesdeFila),
      ventas.map(ventaLoteDesdeFila),
      desde,
      hasta
    );
    return {
      archivo: { nombre: `patrimonio_${desde}_a_${hasta}.csv`, contenido: csvPatrimonio(valores) },
      resumen: `${valores.activos.length} activos · ${valores.filas.length} días`,
    };
  }

  async function guardarPendientes() {
    if (!pendientes) return;
    try {
      await compartirArchivos(pendientes);
      setPendientes(null);
      setResultado((r) => r?.replace(/^Listo:/, 'Exportado:').replace(/ Pulsa «Guardar archivos» para terminar\.$/, '') ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se han podido guardar los archivos.');
    }
  }

  async function exportar(que: QueExportar) {
    setError(null);
    setResultado(null);
    setPendientes(null);
    if (!desde || !hasta) {
      setError('Elige las dos fechas.');
      return;
    }
    if (desde > hasta) {
      setError('La fecha «Desde» no puede ser posterior a «Hasta».');
      return;
    }
    setExportando(que);
    try {
      const partes = await Promise.all([
        que !== 'patrimonio' ? generarMovimientos() : null,
        que !== 'movimientos' ? generarPatrimonio() : null,
      ]);
      const generados = partes.filter((p) => p !== null);
      const archivos = generados.map((p) => p.archivo);
      const resumen = generados.map((p) => p.resumen).join(' y ');
      if ((await descargarArchivos(archivos)) === 'necesita-toque') {
        setPendientes(archivos);
        setResultado(`Listo: ${resumen}. Pulsa «Guardar archivos» para terminar.`);
      } else {
        setResultado(`Exportado: ${resumen}.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido exportar.');
    } finally {
      setExportando(null);
    }
  }

  const ocupado = exportando !== null;

  function textoBoton(que: QueExportar, texto: string) {
    return (
      <>
        {exportando === que ? <span className="spin !w-4 !h-4" aria-hidden="true" /> : <IconDescargar />}
        {texto}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
      </div>

      <p className="text-xs text-muted leading-relaxed">
        <span className="text-fg font-medium">Movimientos:</span> fecha, nombre, categoría, subcategoría e importe de
        cada movimiento. <span className="text-fg font-medium">Patrimonio:</span> valor de cada activo día a día y el
        total. Ambas fechas incluidas.
      </p>

      <FormError>{error}</FormError>
      {resultado && (
        <p className="flex items-center gap-1.5 text-[13px] text-ok" role="status">
          <IconCheck className="w-4 h-4" />
          {resultado}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" disabled={ocupado} onClick={() => exportar('movimientos')}>
          {textoBoton('movimientos', 'Movimientos')}
        </Button>
        <Button type="button" variant="secondary" disabled={ocupado} onClick={() => exportar('patrimonio')}>
          {textoBoton('patrimonio', 'Patrimonio')}
        </Button>
        <Button type="button" className="col-span-2" disabled={ocupado} onClick={() => exportar('ambos')}>
          {textoBoton('ambos', 'Exportar los dos')}
        </Button>
        {pendientes && (
          <Button type="button" className="col-span-2" onClick={guardarPendientes}>
            <IconDescargar />
            Guardar archivos
          </Button>
        )}
      </div>
    </div>
  );
}
