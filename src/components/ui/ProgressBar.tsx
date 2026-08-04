interface ProgressBarProps {
  value: number; // 0-100
}

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
