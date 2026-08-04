// Evaluador de expresiones aritméticas simples para el teclado numérico del importe
// (sección 4: "27 / 2 =" debe dejar 13.5 en el campo). Sin `eval`: tokeniza y resuelve
// con la precedencia habitual (× ÷ antes que + −).

type Token = { type: 'num'; value: number } | { type: 'op'; value: '+' | '-' | '*' | '/' };

function tokenizar(expresion: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expresion.length) {
    const ch = expresion[i];
    if (ch === ' ') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i++;
      while (i < expresion.length && /[0-9.]/.test(expresion[i])) {
        num += expresion[i];
        i++;
      }
      const value = Number(num);
      if (Number.isNaN(value)) throw new Error(`numero invalido: ${num}`);
      tokens.push({ type: 'num', value });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error(`caracter invalido: ${ch}`);
  }
  return tokens;
}

function resolverMultiplicacionesYDivisiones(tokens: Token[]): Token[] {
  const resultado: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    const actual = tokens[i];
    if (actual.type === 'op' && (actual.value === '*' || actual.value === '/')) {
      const anterior = resultado.pop();
      const siguiente = tokens[i + 1];
      if (!anterior || anterior.type !== 'num' || !siguiente || siguiente.type !== 'num') {
        throw new Error('expresion invalida');
      }
      const valor = actual.value === '*' ? anterior.value * siguiente.value : anterior.value / siguiente.value;
      resultado.push({ type: 'num', value: valor });
      i += 2;
    } else {
      resultado.push(actual);
      i++;
    }
  }
  return resultado;
}

function resolverSumasYRestas(tokens: Token[]): number {
  if (tokens.length === 0 || tokens[0].type !== 'num') throw new Error('expresion invalida');
  let resultado = tokens[0].value;
  let i = 1;
  while (i < tokens.length) {
    const op = tokens[i];
    const num = tokens[i + 1];
    if (!op || op.type !== 'op' || !num || num.type !== 'num') throw new Error('expresion invalida');
    resultado = op.value === '+' ? resultado + num.value : resultado - num.value;
    i += 2;
  }
  return resultado;
}

export function evaluarExpresion(expresion: string): number | null {
  const limpia = expresion.trim();
  if (limpia === '') return null;
  try {
    const tokens = tokenizar(limpia);
    if (tokens.length === 0 || tokens[0].type !== 'num' || tokens[tokens.length - 1].type !== 'num') {
      return null; // no puede empezar/terminar en operador (expresion incompleta)
    }
    const valor = resolverSumasYRestas(resolverMultiplicacionesYDivisiones(tokens));
    if (!Number.isFinite(valor)) return null; // p.ej. division entre 0
    return Math.round(valor * 100) / 100;
  } catch {
    return null;
  }
}
