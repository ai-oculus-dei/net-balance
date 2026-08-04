# TODO

## Configuración manual pendiente (una sola vez)

- [ ] Ejecutar `supabase/migrations/0001_schema.sql` y `0002_rls.sql` en el SQL Editor de Supabase (en ese orden).
- [ ] Supabase Dashboard → Authentication → Providers → Email → desactivar "Allow new users to sign up".
- [ ] Supabase Dashboard → Authentication → Users → crear las 2 cuentas (`amda.97@gmail.com`, `lauraplaza403@gmail.com`).
- [ ] Ejecutar los `UPDATE` de renombrado de perfiles indicados al final de `0001_schema.sql` (Alvaro / Lauri).
- [ ] GitHub → Settings → Pages → Build and deployment → Source = "GitHub Actions".
- [ ] GitHub → Settings → Secrets and variables → Actions → añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- [ ] Copiar `.env.example` a `.env.local` y rellenarlo para desarrollo local (`npm run dev`).

## Pendiente de definir (sección 14 de REQUIREMENTS.md, no bloqueante)

- [ ] Nivel de agregación de las series temporales (por ahora Dashboard usa mensual fijo, 6 meses).
- [ ] Backup/exportación de la base de datos.

## Mejoras conocidas / deuda técnica

- [ ] Los iconos de `public/icons/*.svg` son un placeholder (monograma "NB"); sustituir por un diseño real cuando se defina la identidad visual de la app.
- [ ] Persistencia de `aportaciones_objetivo`: hoy `useDisponibleMes` calcula el disponible y las aportaciones aplicadas en el cliente en cada carga, pero no las escribe todavía en la tabla `aportaciones_objetivo` (pensada para auditoría vía RPC `security definer`, ver sección 8 del plan de arquitectura). Sin esto, `acumulado` de cada objetivo no se actualiza solo — falta la función RPC que, al cierre de cada mes, sume la aportación aplicada al `acumulado` del objetivo y deje el registro en `aportaciones_objetivo`.
- [ ] Tipos de `src/lib/supabase/database.types.ts` están escritos a mano porque no hay CLI de Supabase autenticado en este entorno. Cuando se disponga de `supabase login`, regenerar con:
      `npx supabase gen types typescript --project-id koyvpbsnrxqheaugkxbu --schema public > src/lib/supabase/database.types.ts`
- [ ] `npm audit` reporta un aviso "high" sobre `react-router-dom` (GHSA-qwww-vcr4-c8h2, CSRF en "RSC Mode"). No aplica a esta app: es una SPA client-side con `HashRouter`, sin React Server Components ni server actions. Revisar si sale una versión >8.2.0 que lo resuelva sin downgrade.
- [ ] Sin tests de integración de RLS todavía (ver sección "Verificación end-to-end" del plan de arquitectura: probar con las 2 cuentas reales que `privado`/`compartido` se respeta).
