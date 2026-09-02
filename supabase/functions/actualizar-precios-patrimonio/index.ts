// Edge Function: actualiza precio_actual_unitario de las posiciones de Patrimonio que tengan
// un ticker y NO usen tae (esas se calculan solas, ver src/lib/finance/patrimonio.ts).
//
// Se consulta UNA VEZ por cada ticker+mercado distinto (el tipo no entra en la agrupacion, ver
// precioDelGrupo mas abajo), no una vez por posicion: varias compras del mismo activo (p.ej. 5
// compras de Bitcoin en fechas distintas) comparten una sola consulta a la API y esa misma
// respuesta se aplica a todas — igual que se agrupan visualmente en una sola tarjeta (ver
// claveActivo/agruparPorActivo en src/lib/finance/patrimonio.ts). Consultar una vez por posicion
// en vez de una vez por activo agotaba el limite de peticiones por minuto de Twelve
// Data/CoinGecko sin necesidad, incluso con pocos activos distintos.
//
// Sin lista intermedia que mantener a mano: cada activo se consulta en vivo por su propio
// ticker en el momento de ejecutarse, contra:
//   - CoinGecko (gratis, sin clave) para tipo = 'criptomoneda'. El ticker debe ser el ID de
//     CoinGecko (p.ej. "bitcoin", no "BTC" — ver https://api.coingecko.com/api/v3/coins/list).
//   - Yahoo Finance (gratis, sin clave, endpoint interno NO oficial/NO documentado que usa la
//     propia web de Yahoo — el mismo que usan proyectos como la libreria "yfinance" de Python
//     desde hace años; puede dejar de funcionar sin aviso, pero es la unica fuente gratuita que
//     cubre de verdad mercados europeos, algo que Twelve Data no hacia en su plan gratuito ni
//     siquiera para ETFs/acciones) para el resto. El ticker tiene que ser el simbolo de Yahoo
//     Finance CON el sufijo de mercado incluido (p.ej. "AF.PA" para Air France en Euronext
//     Paris, "NUKL.DE" para un ETF en Xetra, "0P00011HBM.F" para un fondo en Frankfurt, sin
//     sufijo para NASDAQ/NYSE) — el campo "mercado" de la posicion ya NO se usa para esta
//     consulta (Yahoo no necesita un parametro aparte, el sufijo del ticker ya lo identifica).
//
// Divisa del ticker (columna moneda, EUR o USD): si es USD, ademas del precio del ticker se
// pide el tipo de cambio EUR/USD (ticker "EURUSD=X" de Yahoo, tambien gratis) UNA SOLA VEZ por
// ejecucion (no una vez por posicion en USD) y se divide el precio en USD entre ese tipo de
// cambio antes de guardar — precio_actual_unitario siempre queda en EUR, sea cual sea la
// divisa nativa del ticker.
//
// El plan de pago de Twelve Data se descarto por precio/beneficio para un puñado de posiciones
// personales — ver REQUIREMENTS.md seccion 15 para el historial de por que se probo y se dejo.
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
// (No hace falta ninguna clave de API: CoinGecko y Yahoo Finance son ambas gratis y sin clave.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automaticamente.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface PosicionAActualizar {
  id: string;
  tipo: string;
  ticker: string;
  mercado: string | null;
  moneda: string;
}

interface ResultadoPrecio {
  precio: number | null;
  // Motivo por el que no se pudo obtener el precio (null si precio no es null).
  error: string | null;
}

async function precioYahoo(ticker: string): Promise<ResultadoPrecio> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
  // Sin User-Agent, Yahoo responde 429/999 de forma sistematica: no distingue "cliente
  // sospechoso" de "sin cabecera", asi que basta un UA de navegador generico.
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      precio: null,
      error: `Yahoo Finance (${res.status}): ${data?.chart?.error?.description ?? 'error desconocido'}`,
    };
  }
  const precio = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof precio !== 'number') {
    return { precio: null, error: 'Yahoo Finance: precio no disponible para este ticker' };
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

// El ticker+mercado es el codigo univoco del activo — el tipo NO entra en la clave de
// agrupacion (a diferencia de claveActivo() en el cliente, que sí lo usa para el nombre/P&L
// agregado): si el mismo ticker aparece en dos posiciones con un tipo distinto (p.ej. una mal
// etiquetada a mano), siguen siendo el mismo activo real y deben consultarse juntas. Para saber
// si toca CoinGecko o Yahoo Finance, basta con que ALGUNA posicion del grupo este marcada como
// criptomoneda: ya sabemos que ese ticker es una cripto, y esa clasificacion "hereda" a todas
// las demas posiciones del grupo aunque tengan otro tipo puesto por error.
//
// tipoCambioEurUsd/errorTipoCambio se calculan una unica vez por ejecucion (ver mas abajo) y se
// pasan ya resueltos: solo se usan si el grupo esta en USD y no es cripto (CoinGecko ya devuelve
// el precio en EUR directamente, sin conversion).
async function precioDelGrupo(
  grupo: PosicionAActualizar[],
  tipoCambioEurUsd: number | null,
  errorTipoCambio: string | null
): Promise<ResultadoPrecio> {
  const [representante] = grupo;
  const esCripto = grupo.some((p) => p.tipo === 'criptomoneda');
  if (esCripto) return precioCoinGecko(representante.ticker);

  const resultado = await precioYahoo(representante.ticker);
  if (resultado.precio === null || representante.moneda !== 'USD') return resultado;

  if (tipoCambioEurUsd === null) {
    return { precio: null, error: `No se pudo convertir de USD a EUR: ${errorTipoCambio ?? 'tipo de cambio no disponible'}` };
  }
  return { precio: resultado.precio / tipoCambioEurUsd, error: null };
}

function agruparPorActivo(posiciones: PosicionAActualizar[]): PosicionAActualizar[][] {
  const grupos = new Map<string, PosicionAActualizar[]>();
  for (const p of posiciones) {
    const clave = `${p.ticker.trim().toLowerCase()}|${(p.mercado ?? '').trim().toLowerCase()}`;
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
    .select('id, tipo, ticker, mercado, moneda')
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

  // El tipo de cambio EUR/USD se pide como mucho una vez por ejecucion, no una vez por cada
  // posicion en USD — mismo motivo que agrupar por ticker: no gastar peticiones de mas.
  const necesitaDolar = grupos.some(
    (g) => !g.some((p) => p.tipo === 'criptomoneda') && g[0].moneda === 'USD'
  );
  let tipoCambioEurUsd: number | null = null;
  let errorTipoCambio: string | null = null;
  if (necesitaDolar) {
    const resultado = await precioYahoo('EURUSD=X');
    tipoCambioEurUsd = resultado.precio;
    errorTipoCambio = resultado.error;
  }

  for (const grupo of grupos) {
    const ids = grupo.map((p) => p.id);

    try {
      const { precio, error: errorPrecio } = await precioDelGrupo(grupo, tipoCambioEurUsd, errorTipoCambio);
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
