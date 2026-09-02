import { useEffect, useRef, useState } from 'react';
import { NumericKeypad } from './NumericKeypad';
import { evaluarExpresion } from '../../lib/finance/evaluarExpresion';

interface ImporteKeypadInputProps {
  label: string;
  value: number; // magnitud actual (siempre positiva; el signo lo decide el resto del formulario)
  onChange: (magnitud: number) => void;
  colorClassName?: string;
  decimales?: number; // precision del redondeo (p.ej. 2 para importes en euros, mas para cantidades fraccionarias)
  // Texto fijo al final del valor ya formateado (p.ej. " €") — solo se aplica en reposo (valor
  // ya cerrado/sincronizado desde fuera), nunca mientras se esta escribiendo una expresion en
  // curso (ver handleDone), para no interferir con la calculadora.
  sufijo?: string;
}

function formatearMagnitud(valor: number, decimales: number, sufijo: string): string {
  if (valor === 0) return '';
  // Decimales fijos solo cuando hay sufijo (p.ej. "50.00 €"): sin sufijo se mantiene el
  // comportamiento de siempre (sin ceros de mas) para no afectar a los demas campos que usan
  // este mismo componente (Cantidad, TAE...) y no lo piden.
  return sufijo ? `${valor.toFixed(decimales)}${sufijo}` : String(valor);
}

function simbolosParaMostrar(expresion: string): string {
  return expresion.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
}

export function ImporteKeypadInput({
  label,
  value,
  onChange,
  colorClassName = '',
  decimales = 2,
  sufijo = '',
}: ImporteKeypadInputProps) {
  const [expresion, setExpresion] = useState(() => formatearMagnitud(value, decimales, sufijo));
  const [abierto, setAbierto] = useState(false);
  const ultimoValorEmitido = useRef(value);

  // Si el valor llega desde fuera (p.ej. al abrir el formulario en modo edicion) y no es el que
  // el usuario esta escribiendo ahora mismo, sincroniza lo mostrado.
  useEffect(() => {
    if (value !== ultimoValorEmitido.current) {
      setExpresion(formatearMagnitud(value, decimales, sufijo));
      ultimoValorEmitido.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(nuevaExpresion: string) {
    setExpresion(nuevaExpresion);
    const resultado = evaluarExpresion(nuevaExpresion, decimales);
    if (resultado !== null) {
      const magnitud = Math.abs(resultado);
      ultimoValorEmitido.current = magnitud;
      onChange(magnitud);
    }
  }

  function handleDigit(digito: string) {
    if (digito === '.') {
      const numeroActual = expresion.split(/[+\-*/]/).pop() ?? '';
      if (numeroActual.includes('.')) return; // evita "1.2.3"
    }
    commit(expresion + digito);
  }

  function handleOperator(op: '+' | '-' | '*' | '/') {
    if (expresion === '') return; // el importe siempre es positivo: no se puede empezar por un operador
    const ultimoCaracter = expresion.slice(-1);
    if ('+-*/'.includes(ultimoCaracter)) {
      commit(expresion.slice(0, -1) + op); // sustituye el operador anterior en vez de encadenarlos
      return;
    }
    commit(expresion + op);
  }

  function handleEquals() {
    const resultado = evaluarExpresion(expresion, decimales);
    if (resultado === null) return;
    commit(String(Math.abs(resultado)));
  }

  function handleBackspace() {
    commit(expresion.slice(0, -1));
  }

  function handleDone() {
    // Al cerrar el teclado, si hay un valor valido se muestra ya formateado (decimales fijos +
    // sufijo) en vez de dejar la expresion tal cual se escribio (p.ej. "50" sin el "=" pulsado).
    if (ultimoValorEmitido.current !== 0) {
      setExpresion(formatearMagnitud(ultimoValorEmitido.current, decimales, sufijo));
    }
    setAbierto(false);
  }

  function handleAbrir() {
    // Si estaba en reposo con el sufijo aplicado (p.ej. "50.00 €"), se quita antes de reabrir el
    // teclado — si no, un "+" o un digito se encadenarian detras del sufijo en vez del numero.
    if (sufijo && expresion.endsWith(sufijo)) {
      setExpresion(expresion.slice(0, -sufijo.length));
    }
    setAbierto(true);
  }

  return (
    <div className="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]">
      <span>{label}</span>
      <button
        type="button"
        onClick={handleAbrir}
        className={`text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 font-mono text-lg ${colorClassName}`}
      >
        {simbolosParaMostrar(expresion) || '0'}
      </button>
      {abierto && (
        <NumericKeypad
          onDigit={handleDigit}
          onOperator={handleOperator}
          onEquals={handleEquals}
          onBackspace={handleBackspace}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
