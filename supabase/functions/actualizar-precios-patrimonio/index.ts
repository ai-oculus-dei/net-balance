// Edge Function: actualiza precio_actual_unitario de las posiciones de Patrimonio que tengan
// un ticker y NO usen tae (esas se calculan solas, ver src/lib/finance/patrimonio.ts).
//
// Se consulta UNA VEZ por cada ticker+mercado+tipo distinto, no una vez por posicion: varias
// compras del mismo activo (p.ej. 5 compras de Bitcoin en fechas distintas) comparten una sola
// consulta a la API y esa misma respuesta se aplica a todas — igual que se agrupan visualmente
// en una sola tarjeta (ver claveActivo/agruparPorActivo en src/lib/finance/patrimonio.ts).
// Consultar una vez por posicion en vez de una vez por activo agotaba el limite de peticiones
// por minuto de Twelve Data/CoinGecko sin necesidad, incluso con pocos activos distintos.
//
// Sin lista intermedia que mantener a mano: cada activo se consulta en vivo por su propio
// ticker en el momento de ejecutarse, contra:
//   - CoinGecko (gratis, sin clave) para tipo = 'criptomoneda'. El ticker debe ser el ID de
//     CoinGecko (p.ej. "bitcoin", no "BTC" — ver https://api.coingecko.com/api/v3/coins/list).
//   - Twelve Data (clave gratuita, ver TWELVE_DATA_API_KEY mas abajo) para el resto, Commodity
//     incluido: aunque el simbolo "de materia prima" (p.ej. "XAU/EUR") esta detras de un plan de
//     pago de Twelve Data (ver REQUIREMENTS.md seccion 15), un ETC/ETF que replique el precio de
//     esa materia prima (p.ej. Xetra-Gold, ticker "4GLD") SI esta cubierto por la clave gratuita
//     — asi que no se excluye Commodity de nada, se intenta igual que el resto con el ticker que
//     tenga la posicion.
//
// Si no se consigue un precio para una posicion (ticker no encontrado, simbolo no cubierto,
// limite de peticiones...) se guarda el motivo en su columna error_precio (y NO se toca
// precio_actual_unitario, para no perder el ultimo precio bueno conocido) — el cliente lo usa
// para mostrar "-" en vez de un numero que podria estar desactualizado. En cuanto una
// actualizacion vuelve a funcionar, error_precio se limpia a null.
//
// Se invoca por HTTP (ver supabase/migrations/0012_patrimonio_cron_horario.sql, que la programa
// cada hora de 8:00 a 23:00 hora de España via pg_cron + pg_net) con la service_role key, para
// poder actualizar las posiciones de los dos usuarios sin depender de una sesion concreta.
//
// Al terminar cada ejecucion (haya ido bien o mal alguna posicion suelta) se deja constancia de
// la hora en patrimonio_precios_actualizacion, una tabla de una sola fila que el cliente lee para
// mostrarla de forma discreta al pie de la pagina de Patrimonio.
//
// Seguridad: una Edge Function es una URL publica en internet. La verificacion de JWT que
// Supabase aplica por defecto solo exige ALGUN token valido del proyecto — la propia clave
// `anon` (publica, va en el bundle de la app) tambien lo es, asi que sin este chequeo
// cualquiera podria invocarla. Por eso se exige aqui, ademas, que el Bearer token sea
// exactamente la service_role key: solo el cron (o quien tenga esa clave, que nunca sale de
// los secretos del proyecto) puede ejecutarla de verdad.
//
// OJO con cual es "la service_role key": en proyectos con el sistema nuevo de claves de
// Supabase, SUPABASE_SERVICE_ROLE_KEY (inyectada aqui automaticamente) resuelve a la clave
// corta `sb_secret_...` (Dashboard -> Settings -> API), NO al JWT largo clasico de
// "service_role" (`eyJ...`) — son dos claves distintas. El secreto guardado en Vault
// (0012_patrimonio_cron_horario.sql, `service_role_key`) tiene que ser el `sb_secret_...`, si
// no la funcion responde 401 aunque el cron mande "algo" en el Authorization.
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

interface ResultadoPrecio {
  precio: number | null;
  // Motivo por el que no se pudo obtener el precio (null si precio no es null).
  error: string | null;
}

async function precioTwelveData(ticker: string, mercado: string | null): Promise<ResultadoPrecio> {
  const url = new URL('https://api.twelvedata.com/price');
  url.searchParams.set('symbol', ticker);
  if (mercado) url.searchParams.set('exchange', mercado);
  url.searchParams.set('apikey', TWELVE_DATA_API_KEY);

  const res = await fetch(url);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { precio: null, error: `Twelve Data (${res.status}): ${data?.message ?? 'error desconocido'}` };
  }
  const precio = Number(data?.price);
  if (!Number.isFinite(precio)) {
    return { precio: null, error: `Twelve Data: ${data?.message ?? 'precio no disponible para este ticker'}` };
  }
  return { precio, error: null };
}

async function precioCoinGecko(coinId: string): Promise<ResultadoPrecio> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=eur`;
  const res = await fetch(url);
  if (!res.ok) return { precio: null, error: `CoinGecko (${res.status}): error desconocido` };
  const data = await res.json().catch(() => null);
  const precio = data?.[coinId]?.eur;
  if (typeof precio !== 'number') {
    return { precio: null, error: 'CoinGecko: precio no disponible (revisa que el ticker sea el ID de CoinGecko)' };
  }
  return { precio, error: null };
}

async function precioDe(p: PosicionAActualizar): Promise<ResultadoPrecio> {
  return p.tipo === 'criptomoneda' ? precioCoinGecko(p.ticker) : precioTwelveData(p.ticker, p.mercado);
}

// Agrupa las posiciones por tipo+ticker+mercado (normalizado): mismo criterio que claveActivo()
// en src/lib/finance/patrimonio.ts, para que varias compras del mismo activo compartan una sola
// consulta a la API en vez de una por posicion.
function agruparPorActivo(posiciones: PosicionAActualizar[]): PosicionAActualizar[][] {
  const grupos = new Map<string, PosicionAActualizar[]>();
  for (const p of posiciones) {
    const clave = `${p.tipo}|${p.ticker.trim().toLowerCase()}|${(p.mercado ?? '').trim().toLowerCase()}`;
    const lista = grupos.get(clave);
    if (lista) lista.push(p);
    else grupos.set(clave, [p]);
  }
  return Array.from(grupos.values());
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
  const grupos = agruparPorActivo((posiciones ?? []) as PosicionAActualizar[]);

  for (const grupo of grupos) {
    const ids = grupo.map((p) => p.id);
    const representante = grupo[0]; // mismo tipo+ticker+mercado para todo el grupo

    try {
      const { precio, error: errorPrecio } = await precioDe(representante);
      if (precio === null) {
        await supabase.from('posiciones_patrimonio').update({ error_precio: errorPrecio }).in('id', ids);
        for (const p of grupo) resultados.push({ id: p.id, ticker: p.ticker, ok: false, error: errorPrecio });
        continue;
      }

      const { error: updateError } = await supabase
        .from('posiciones_patrimonio')
        .update({ precio_actual_unitario: precio, error_precio: null })
        .in('id', ids);

      for (const p of grupo) {
        resultados.push(
          updateError
            ? { id: p.id, ticker: p.ticker, ok: false, error: updateError.message }
            : { id: p.id, ticker: p.ticker, ok: true, precio }
        );
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      await supabase.from('posiciones_patrimonio').update({ error_precio: mensaje }).in('id', ids);
      for (const p of grupo) resultados.push({ id: p.id, ticker: p.ticker, ok: false, error: mensaje });
    }
  }

  await supabase
    .from('patrimonio_precios_actualizacion')
    .upsert({ id: true, actualizado_en: new Date().toISOString() });

  return new Response(JSON.stringify({ actualizadas: resultados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
