interface ProgressBarProps {
  value: number; // 0-100 (por encima de 100 se muestra llena y rayada)
  color?: string; // color CSS del relleno; por defecto, cian
  thin?: boolean;
}

export function ProgressBar({ value, color = 'var(--cyan)', thin = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`bar ${thin ? 'thin' : ''}`}>
      <i
        className={value > 100 ? 'over' : ''}
        style={{ width: `${clamped}%`, background: color, boxShadow: `0 0 10px ${color}` }}
      />
    </div>
  );
}
