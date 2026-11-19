export interface ArchivoExportado {
  nombre: string;
  contenido: string;
}

// 'ok': archivos entregados (o el usuario cerro la hoja de compartir).
// 'necesita-toque': iOS ha rechazado abrir la hoja de compartir porque ya no venia "directamente"
// de un toque (habia que esperar a descargar los datos antes): hay que llamar a
// compartirArchivos() desde otro toque, con los archivos ya generados.
export type ResultadoDescarga = 'ok' | 'necesita-toque';

function aFiles(archivos: ArchivoExportado[]): File[] {
  return archivos.map((a) => new File([a.contenido], a.nombre, { type: 'text/csv;charset=utf-8' }));
}

function usarHojaCompartir(files: File[]): boolean {
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return esIOS && typeof navigator.canShare === 'function' && navigator.canShare({ files });
}

function descargaNormal(files: File[]) {
  files.forEach((file, i) => {
    // Pequeña pausa entre descargas: algunos navegadores bloquean varias en el mismo instante.
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, i * 300);
  });
}

// En el iPhone (sobre todo con la app instalada en la pantalla de inicio) los enlaces de
// descarga de un Blob no son fiables: alli se usa la hoja de compartir del sistema (Guardar en
// Archivos, AirDrop, Mail...), que acepta varios archivos a la vez. En el resto, descarga normal.
export async function descargarArchivos(archivos: ArchivoExportado[]): Promise<ResultadoDescarga> {
  const files = aFiles(archivos);
  if (usarHojaCompartir(files)) {
    try {
      await navigator.share({ files });
      return 'ok';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'ok'; // cerro la hoja
      if (e instanceof DOMException && e.name === 'NotAllowedError') return 'necesita-toque';
      // Cualquier otro fallo: se intenta la descarga normal.
    }
  }
  descargaNormal(files);
  return 'ok';
}

// Para llamar directamente desde un toque (sin esperas antes), tras un 'necesita-toque'.
export async function compartirArchivos(archivos: ArchivoExportado[]): Promise<void> {
  const files = aFiles(archivos);
  if (!usarHojaCompartir(files)) {
    descargaNormal(files);
    return;
  }
  try {
    await navigator.share({ files });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    throw e;
  }
}
