import { IconBorrarTecla } from '../icons/UiIcons';

interface NumericKeypadProps {
  onDigit: (digito: string) => void;
  onOperator: (op: '+' | '-' | '*' | '/') => void;
  onEquals: () => void;
  onBackspace: () => void;
  onDone: () => void;
}

const FILAS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['.', '0', '⌫', '+'],
];

const OPERADORES = new Set(['÷', '×', '−', '+']);

const TECLA =
  'h-11 rounded-[10px] bg-card-solid border border-line font-mono text-base text-fg flex items-center justify-center active:scale-95 hover-tint transition-transform';

export function NumericKeypad({ onDigit, onOperator, onEquals, onBackspace, onDone }: NumericKeypadProps) {
  function handleKey(key: string) {
    if (key === '⌫') return onBackspace();
    if (key === '÷') return onOperator('/');
    if (key === '×') return onOperator('*');
    if (key === '−') return onOperator('-');
    if (key === '+') return onOperator('+');
    return onDigit(key);
  }

  return (
    <div className="p-2 border border-line rounded-[14px] bg-bg-2">
      <div className="grid grid-cols-4 gap-1.5">
        {FILAS.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKey(key)}
            aria-label={key === '⌫' ? 'Borrar' : undefined}
            className={`${TECLA} ${OPERADORES.has(key) ? '!text-cyan' : ''}`}
          >
            {key === '⌫' ? <IconBorrarTecla className="w-5 h-5 text-muted" /> : key}
          </button>
        ))}
        <button type="button" onClick={onDone} className={`${TECLA} col-span-3 h-14 font-sans font-semibold`}>
          Hecho
        </button>
        <button type="button" onClick={onEquals} className="btn btn-primary h-11 self-center !min-h-0 !p-0 font-mono text-lg">
          =
        </button>
      </div>
    </div>
  );
}
