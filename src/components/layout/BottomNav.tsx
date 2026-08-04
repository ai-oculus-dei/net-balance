import { NavLink } from 'react-router-dom';
import { IconAjustes, IconInicio, IconMovimientos, IconObjetivos, IconVisualizaciones } from './NavIcons';

const links = [
  { to: '/', label: 'Inicio', end: true, Icon: IconInicio },
  { to: '/movimientos', label: 'Movimientos', Icon: IconMovimientos },
  { to: '/objetivos', label: 'Objetivos', Icon: IconObjetivos },
  { to: '/visualizaciones', label: 'Visualizaciones', Icon: IconVisualizaciones },
  { to: '/ajustes', label: 'Ajustes', Icon: IconAjustes },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] px-1 pt-1.5 sm:static sm:border-t-0 sm:border-b sm:justify-center sm:gap-6 sm:px-4 sm:py-3"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
    >
      {links.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 px-1 rounded font-medium ${
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="w-6 h-6 sm:w-4 sm:h-4" />
              <span className={`text-[11px] sm:text-sm leading-none ${isActive ? 'inline' : 'hidden sm:inline'}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
