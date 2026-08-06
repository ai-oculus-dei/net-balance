import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './lib/auth/AuthProvider';
import { ThemeProvider } from './lib/theme/ThemeProvider';

// Comprueba cada minuto si hay una version nueva desplegada, en vez de solo al abrir la app:
// el service worker por si solo no revisa esto con frecuencia, y GitHub Pages ademas cachea
// index.html/sw.js hasta 10 minutos en su CDN, asi que un despliegue puede tardar en notarse.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60_000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
