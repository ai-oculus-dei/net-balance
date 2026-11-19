import { NavLink } from 'react-router-dom';
import { IconAjustes, IconInicio, IconMovimientos, IconPatrimonio, IconVisualizaciones } from './NavIcons';

// `corto` es el texto bajo el icono en la barra flotante (6 pestañas en 336 px de ancho a 360 px
// de pantalla): "Visualizaciones"/"Movimientos" no caben. El nombre completo queda como
// aria-label/title.
const links = [
  { to: '/', label: 'Inicio', corto: 'Inicio', end: true, Icon: IconInicio },
  { to: '/movimientos', label: 'Movimientos', corto: 'Movs.', Icon: IconMovimientos },
  { to: '/visualizaciones', label: 'Visualizaciones', corto: 'Gráficos', Icon: IconVisualizaciones },
  { to: '/patrimonio', label: 'Patrimonio', corto: 'Patrim.', Icon: IconPatrimonio },
  { to: '/ajustes', label: 'Ajustes', corto: 'Ajustes', Icon: IconAjustes },
];

export function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Navegación principal">
      {links.map(({ to, label, corto, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          title={label}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <Icon aria-hidden="true" />
          <span>{corto}</span>
        </NavLink>
      ))}
    </nav>
  );
}
