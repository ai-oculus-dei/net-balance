// Ajustes de visualizacion para el iPhone (PWA instalada). Solo afectan a la presentacion:
//  - bloquea el zoom por gesto (Safari ignora user-scalable=no en algunos casos);
//  - mide la altura del teclado con visualViewport y la publica en --kb (las hojas inferiores
//    la usan para subir por encima del teclado) y marca <html class="kb-open"> para ocultar la
//    barra inferior y el boton flotante mientras se escribe.

const UMBRAL_TECLADO_PX = 120;

export function instalarAjustesIOS() {
  const bloquear = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', bloquear, { passive: false });
  document.addEventListener('gesturechange', bloquear, { passive: false });

  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;

  function actualizar() {
    if (!vv) return;
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--kb', `${kb}px`);
    root.classList.toggle('kb-open', kb > UMBRAL_TECLADO_PX);
  }

  vv.addEventListener('resize', actualizar);
  vv.addEventListener('scroll', actualizar);
  actualizar();
}

// Bloqueo del scroll de la pagina de detras mientras hay una hoja/overlay abierto. En iOS no
// basta con overflow:hidden: se fija el body en su posicion y al cerrar se restaura el scroll
// exacto. Con contador, para hojas anidadas (p.ej. la confirmacion dentro de un formulario).
let bloqueos = 0;
let scrollGuardado = 0;

export function bloquearScroll() {
  bloqueos += 1;
  if (bloqueos > 1) return;
  scrollGuardado = window.scrollY;
  const s = document.body.style;
  s.position = 'fixed';
  s.top = `-${scrollGuardado}px`;
  s.left = '0';
  s.right = '0';
  s.width = '100%';
}

export function desbloquearScroll() {
  bloqueos = Math.max(0, bloqueos - 1);
  if (bloqueos > 0) return;
  const s = document.body.style;
  s.position = '';
  s.top = '';
  s.left = '';
  s.right = '';
  s.width = '';
  window.scrollTo(0, scrollGuardado);
}

// Pila de hojas abiertas: Escape cierra solo la de arriba.
const pilaHojas: symbol[] = [];

export function apilarHoja(id: symbol) {
  pilaHojas.push(id);
}

export function desapilarHoja(id: symbol) {
  const i = pilaHojas.lastIndexOf(id);
  if (i >= 0) pilaHojas.splice(i, 1);
}

export function esHojaSuperior(id: symbol) {
  return pilaHojas[pilaHojas.length - 1] === id;
}
