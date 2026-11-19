import { IconPlus } from '../icons/UiIcons';

interface QuickAddButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

export function QuickAddButton({ onClick, ariaLabel = 'Añadir movimiento' }: QuickAddButtonProps) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} title={ariaLabel} className="btn btn-primary fab">
      <IconPlus strokeWidth={2.25} />
      Añadir
    </button>
  );
}
