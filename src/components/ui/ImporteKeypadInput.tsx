import { useEffect, useRef, useState } from 'react';
import { NumericKeypad } from './NumericKeypad';
import { evaluarExpresion } from '../../lib/finance/evaluarExpresion';

interface ImporteKeypadInputProps {
  label: string;
  value: number; // magnitud actual (siempre positiva; el signo lo decide el resto del formulario)
  onChange: (magnitud: number) => void;
  colorClassName?: string;
  decimales?: number; // precision del redondeo (p.ej. 2 para importes en euros, mas para cantidades fraccionarias)
}

function formatearMagnitud(valor: number): string {
  return valor === 0 ? '' : String(valor);
}

function simbolosParaMostrar(expresion: string): string {
  return expresion.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
}

export function ImporteKeypadInput({ label, value, onChange, colorClassName = '', decimales = 2 }: ImporteKeypadInputProps) {
  const [expresion, setExpresion] = useState(() => formatearMagnitud(value));
  const [abierto, setAbierto] = useState(false);
  const ultimoValorEmitido = useRef(value);

  // Si el valor llega desde fuera (p.ej. al abrir el formulario en modo edicion) y no es el que
  // el usuario esta escribiendo ahora mismo, sincroniza lo mostrado.
  useEffect(() => {
    if (value !== ultimoValorEmitido.current) {
      setExpresion(formatearMagnitud(value));
      ultimoValorEmitido.current = value;
    }
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

  return (
    <div className="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => setAbierto(true)}
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
          onDone={() => setAbierto(false)}
        />
      )}
    </div>
  );
}
