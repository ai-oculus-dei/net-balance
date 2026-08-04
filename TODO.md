# TODO

## Configuración manual pendiente (una sola vez)

- [x] Ejecutar `supabase/migrations/0001_schema.sql` y `0002_rls.sql` en el SQL Editor de Supabase (en ese orden).
- [x] Supabase Dashboard → Authentication → Providers → Email → desactivar "Allow new users to sign up".
- [x] Supabase Dashboard → Authentication → Users → crear las 2 cuentas (`amda.97@gmail.com`, `lauraplaza403@gmail.com`).
- [x] Ejecutar los `UPDATE` de renombrado de perfiles indicados al final de `0001_schema.sql` (Alvaro / Lauri).
- [x] GitHub → Settings → Pages → Build and deployment → Source = "GitHub Actions".
- [x] GitHub → Settings → Secrets and variables → Actions → añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- [ ] Copiar `.env.example` a `.env.local` y rellenarlo para desarrollo local (`npm run dev`).
- [x] Ejecutar `supabase/migrations/0003_subcategoria_facturas.sql` en el SQL Editor de Supabase (añade "Facturas" a Vivienda).
- [x] Ejecutar `supabase/migrations/0004_reemplazar_recurrentes_por_categorias_fijas.sql` en el SQL Editor de Supabase (elimina la funcionalidad de recurrentes y define "gastos fijos" por subcategoría — sección 6).
- [x] Ejecutar `supabase/migrations/0005_aportaciones_desde_ahorro.sql` en el SQL Editor de Supabase (nuevas columnas `es_ahorro`/`es_traspaso` en subcategorías, y redefine `aportaciones_objetivo` con el trigger que mantiene `acumulado` sincronizado — sección 7).

## Pendiente de definir (sección 14 de REQUIREMENTS.md, no bloqueante)

- [ ] Nivel de agregación de las series temporales (por ahora Dashboard usa mensual fijo, 6 meses).
- [ ] Backup/exportación de la base de datos.

## Mejoras conocidas / deuda técnica

- [ ] Los iconos de `public/icons/*.svg` son un placeholder (monograma "NB"); sustituir por un diseño real cuando se defina la identidad visual de la app.
- [ ] El "objetivo del mes" (sección 7, tarjetas "Ahorrar este mes") sigue siendo solo una referencia visual — no se aplica ni se recuerda automáticamente. Si en el futuro se quiere avisar cuando el usuario no ha destinado suficiente dinero real a un objetivo ese mes, haría falta comparar `aportaciones_objetivo` del mes en curso contra `calcularAportacionDeseada`.
- [ ] La asignación de un gasto de "Ahorro" a un objetivo solo se puede hacer sobre movimientos propios (`usuario_id` = usuario de la sesión), nunca "a nombre del otro" — por las políticas RLS de `objetivos_ahorro` (individuales, sección 7), la sesión activa no puede ver los objetivos del otro usuario para poder elegirlos.
- [ ] Tipos de `src/lib/supabase/database.types.ts` están escritos a mano porque no hay CLI de Supabase autenticado en este entorno. Cuando se disponga de `supabase login`, regenerar con:
      `npx supabase gen types typescript --project-id koyvpbsnrxqheaugkxbu --schema public > src/lib/supabase/database.types.ts`
- [ ] `npm audit` reporta un aviso "high" sobre `react-router-dom` (GHSA-qwww-vcr4-c8h2, CSRF en "RSC Mode"). No aplica a esta app: es una SPA client-side con `HashRouter`, sin React Server Components ni server actions. Revisar si sale una versión >8.2.0 que lo resuelva sin downgrade.
- [ ] Sin tests de integración de RLS todavía (ver sección "Verificación end-to-end" del plan de arquitectura: probar con las 2 cuentas reales que `privado`/`compartido` se respeta).
- [ ] La selección de "líneas" en Visualizaciones no se guarda entre visitas (siempre empieza en blanco, últimos 6 meses). Si se quiere recordar la última comparación, habría que persistirla en `localStorage` (no hace falta base de datos, es puramente de la UI de un dispositivo).
- [ ] El límite de 8 líneas en Visualizaciones es deliberado: es el techo real de la paleta categórica validada por daltonismo/contraste (ver `src/components/charts/colorsCategoricos.ts`). No se puede subir más sin repetir color entre dos líneas — si hiciera falta más, habría que rediseñar como tabla o pequeños múltiplos en vez de generar más colores.
