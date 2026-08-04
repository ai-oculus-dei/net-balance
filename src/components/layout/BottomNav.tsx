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
    <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] py-2 sm:static sm:border-t-0 sm:border-b sm:justify-center sm:gap-6 sm:py-3">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `text-xs sm:text-sm px-2 py-1 rounded ${
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
