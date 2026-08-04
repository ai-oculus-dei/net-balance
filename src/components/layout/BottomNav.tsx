import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/objetivos', label: 'Objetivos' },
  { to: '/recurrentes', label: 'Recurrentes' },
  { to: '/ajustes', label: 'Ajustes' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] px-1 pt-2 sm:static sm:border-t-0 sm:border-b sm:justify-center sm:gap-6 sm:px-4 sm:py-3"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `flex-1 sm:flex-none text-center text-sm font-medium px-1 py-2 rounded truncate ${
              isActive ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-muted)]'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
