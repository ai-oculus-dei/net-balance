interface QuickAddButtonProps {
  onClick: () => void;
}

export function QuickAddButton({ onClick }: QuickAddButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Añadir movimiento"
      className="fixed bottom-20 right-5 sm:bottom-8 z-40 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white text-3xl leading-none flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition"
    >
      +
    </button>
  );
}
