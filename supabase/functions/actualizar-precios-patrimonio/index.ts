// Edge Function: actualiza precio_actual_unitario de las posiciones de Patrimonio que tengan
// un ticker y NO usen tae (esas se calculan solas, ver src/lib/finance/patrimonio.ts).
//
// Sin lista intermedia que mantener a mano: cada posicion se consulta en vivo por su propio
// ticker en el momento de ejecutarse, contra:
//   - CoinGecko (gratis, sin clave) para tipo = 'criptomoneda'. El ticker debe ser el ID de
//     CoinGecko (p.ej. "bitcoin", no "BTC" — ver https://api.coingecko.com/api/v3/coins/list).
//   - Twelve Data (clave gratuita, ver TWELVE_DATA_API_KEY mas abajo) para el resto (stock, etf,
//     fondo_indexado, commodity). El ticker es el simbolo de Twelve Data (p.ej. "AAPL", "AF",
//     "XAU/EUR" para materias primas); si hay varias bolsas para el mismo simbolo, el campo
//     "mercado" de la posicion se manda como parametro `exchange` para desambiguar.
//
// Se invoca por HTTP (ver supabase/migrations/0011_patrimonio_cron_precios.sql, que la programa
// dos veces al dia via pg_cron + pg_net) con la service_role key, para poder actualizar las
// posiciones de los dos usuarios sin depender de una sesion concreta.
//
// Seguridad: una Edge Function es una URL publica en internet. La verificacion de JWT que
// Supabase aplica por defecto solo exige ALGUN token valido del proyecto — la propia clave
// `anon` (publica, va en el bundle de la app) tambien lo es, asi que sin este chequeo
// cualquiera podria invocarla. Por eso se exige aqui, ademas, que el Bearer token sea
// exactamente la service_role key: solo el cron (o quien tenga esa clave, que nunca sale de
// los secretos del proyecto) puede ejecutarla de verdad.
//
// Desplegar con: npx supabase functions deploy actualizar-precios-patrimonio
// Config necesaria (una vez): npx supabase secrets set TWELVE_DATA_API_KEY=...
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automaticamente, no hace
// falta configurarlos a mano.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface PosicionAActualizar {
  id: string;
  tipo: string;
  ticker: string;
  mercado: string | null;
}

async function precioTwelveData(ticker: string, mercado: string | null): Promise<number | null> {
  const url = new URL('https://api.twelvedata.com/price');
  url.searchParams.set('symbol', ticker);
  if (mercado) url.searchParams.set('exchange', mercado);
  url.searchParams.set('apikey', TWELVE_DATA_API_KEY);

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const precio = Number(data?.price);
  return Number.isFinite(precio) ? precio : null;
}

async function precioCoinGecko(coinId: string): Promise<number | null> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=eur`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const precio = data?.[coinId]?.eur;
  return typeof precio === 'number' ? precio : null;
}

async function precioDe(p: PosicionAActualizar): Promise<number | null> {
  return p.tipo === 'criptomoneda' ? precioCoinGecko(p.ticker) : precioTwelveData(p.ticker, p.mercado);
}

Deno.serve(async (req) => {
  // Solo el propio cron (o alguien con la service_role key, que nunca sale de los secretos del
  // proyecto) puede ejecutar esto de verdad — ver nota de seguridad arriba.
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_ROLE_KEY);

  const { data: posiciones, error } = await supabase
    .from('posiciones_patrimonio')
    .select('id, tipo, ticker, mercado')
    .eq('activa', true)
    .is('tae', null)
    .not('ticker', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resultados = [];

  for (const p of (posiciones ?? []) as PosicionAActualizar[]) {
    try {
      const precio = await precioDe(p);
      if (precio === null) {
        resultados.push({ id: p.id, ticker: p.ticker, ok: false, error: 'precio no disponible' });
        continue;
      }

      const { error: updateError } = await supabase
        .from('posiciones_patrimonio')
        .update({ precio_actual_unitario: precio })
        .eq('id', p.id);

      resultados.push(
        updateError
          ? { id: p.id, ticker: p.ticker, ok: false, error: updateError.message }
          : { id: p.id, ticker: p.ticker, ok: true, precio }
      );
    } catch (err) {
      resultados.push({ id: p.id, ticker: p.ticker, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Response(JSON.stringify({ actualizadas: resultados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
