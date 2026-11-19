import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Repo name is "net-balance" -> published at https://ai-oculus-dei.github.io/net-balance/
const base = '/net-balance/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro manual en main.tsx (para poder comprobar actualizaciones cada minuto), en vez
      // del script auto-inyectado por defecto.
      injectRegister: false,
      manifest: {
        name: 'Net Balance',
        short_name: 'NetBalance',
        description: 'Gastos, ingresos y objetivos de ahorro',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#05070d',
        theme_color: '#05070d',
        // PNG para los sistemas que no aceptan SVG como icono instalado (Android/Chrome lo
        // prefieren); el SVG queda como opcion escalable. El iPhone usa apple-touch-icon.png
        // (enlazado en index.html), no el manifiesto.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        // Menu al mantener pulsado el icono instalado (soportado en Android; iOS lo ignora,
        // por eso ademas existe el acceso directo por URL de Ajustes -> "Nuevo gasto").
        shortcuts: [
          {
            name: 'Nuevo gasto',
            short_name: 'Nuevo gasto',
            url: `${base}#/nuevo-gasto`,
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Los datos financieros nunca deben servirse desde caché: solo se precachea el app shell.
        navigateFallbackDenylist: [/supabase\.co/],
      },
    }),
  ],
})
