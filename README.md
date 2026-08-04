# net-balance

Aplicación para los gastos del día a día, y para mejorar la salud financiera.

Ver [REQUIREMENTS.md](./REQUIREMENTS.md) para el alcance funcional y [TODO.md](./TODO.md) para las tareas pendientes.

## Stack

React + Vite + TypeScript, Tailwind CSS, Recharts, Supabase (Postgres + Auth + RLS), desplegado en GitHub Pages vía GitHub Actions.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellenar con las credenciales del proyecto de Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción (`dist/`).
- `npm run preview` — sirve el build de producción localmente.
- `npm run test` — tests unitarios (Vitest) de la lógica financiera (`src/lib/finance`).
- `npm run lint` — linter (oxlint).

## Base de datos

El esquema y las políticas de Row Level Security están en `supabase/migrations/`. Se ejecutan manualmente en el SQL Editor de Supabase (ver `TODO.md`).

## Despliegue

Push a `main` dispara `.github/workflows/deploy.yml`, que hace build y publica en GitHub Pages. Requiere los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configurados en el repo.
