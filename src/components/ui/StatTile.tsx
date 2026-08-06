interface StatTileProps {
  label: string;
  value: string;
  colorClassName?: string;
}

export function StatTile({ label, value, colorClassName = '' }: StatTileProps) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`font-mono font-semibold ${colorClassName}`}>{value}</p>
    </div>
  );
}
