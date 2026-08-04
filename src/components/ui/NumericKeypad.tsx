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
    <div className="p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]">
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-accent)] px-2 py-1"
        >
          Hecho
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {FILAS.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKey(key)}
            className="h-11 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-base font-medium text-[var(--color-text)] active:scale-95 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={onEquals}
          className="col-span-4 h-11 rounded-md bg-[var(--color-accent)] text-white text-base font-semibold active:scale-95 hover:opacity-90"
        >
          =
        </button>
      </div>
    </div>
  );
}
