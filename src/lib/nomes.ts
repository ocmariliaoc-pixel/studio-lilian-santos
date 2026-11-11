// Comparação de nomes de clientes: acha cadastros parecidos para não duplicar
// (ex.: "Jade" × "Jade Lima", "Gabriela Schoen" × "Gabrielle Schoene", "Leticia" × "Letícia").

/** minúsculas, sem acento, sem pontuação e com espaços simples */
export function normalizarNome(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Partículas que não ajudam a diferenciar pessoas
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

function partes(nome: string) {
  return normalizarNome(nome)
    .split(" ")
    .filter((p) => p && !PARTICULAS.has(p));
}

function distancia(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  let ant = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++)
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    ant = atual;
  }
  return ant[n];
}

/** Duas palavras "batem": iguais, com 1–2 letras de diferença, ou uma é começo da outra. */
function palavrasParecidas(a: string, b: string) {
  if (a === b) return true;
  const menor = Math.min(a.length, b.length);
  if (menor >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (menor >= 4) return distancia(a, b) <= (menor >= 7 ? 2 : 1);
  return false;
}

/**
 * Nível de parecença (0 = nada; maior = mais parecido).
 *  3: mesmo nome (sem acento/maiúsculas)
 *  2: mesmo primeiro nome e um não tem sobrenome ou os sobrenomes batem ("Jade" × "Jade Lima");
 *     ou primeiro nome quase igual e sobrenome igual ("Gabriela Schoen" × "Gabrielle Schoene")
 *  1: mesmo primeiro nome e algum sobrenome em comum; ou o nome inteiro de uma está dentro do outro
 *     ("Jocelia" × "Antonia Jocelia")
 * Só primeiro nome parecido não conta ("Mariana" × "Marília" são pessoas diferentes).
 */
export function parecenca(a: string, b: string) {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);
  if (!na || !nb) return 0;
  if (na === nb) return 3;
  const pa = partes(a);
  const pb = partes(b);
  if (!pa.length || !pb.length) return 0;
  const ra = pa.slice(1);
  const rb = pb.slice(1);
  const sobrenomesBatem = (min: number) => ra.filter((x) => rb.some((y) => palavrasParecidas(x, y))).length >= min;

  if (pa[0] === pb[0]) {
    if (!ra.length || !rb.length) return 2;
    if (sobrenomesBatem(Math.min(ra.length, rb.length))) return 2;
    return sobrenomesBatem(1) ? 1 : 0;
  }
  if (palavrasParecidas(pa[0], pb[0]) && ra.length && rb.length && sobrenomesBatem(Math.min(ra.length, rb.length)))
    return 2;
  // "Jocelia" × "Antonia Jocelia": todas as palavras do nome menor aparecem iguais no outro
  const [menor, maior] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  if (menor.length < maior.length && menor.some((x) => x.length >= 4) && menor.every((x) => maior.includes(x))) return 1;
  return 0;
}

/** Cadastros parecidos com o nome digitado, do mais para o menos parecido. */
export function clientesParecidas<T extends { nome: string }>(nome: string, clientes: T[], limite = 5) {
  return clientes
    .map((c) => ({ c, p: parecenca(nome, c.nome) }))
    .filter((x) => x.p > 0)
    .sort((x, y) => y.p - x.p || x.c.nome.localeCompare(y.c.nome, "pt-BR"))
    .slice(0, limite)
    .map((x) => x.c);
}

/** Busca da lista: acha por pedaço do nome sem acento ou por nome parecido ("gabriela" acha "Gabrielle"). */
export function nomeCombina(busca: string, nome: string) {
  const b = normalizarNome(busca);
  if (!b) return true;
  const n = normalizarNome(nome);
  if (n.includes(b)) return true;
  const pb = partes(busca);
  const pn = partes(nome);
  return pb.every((x) => pn.some((y) => palavrasParecidas(x, y) || (x.length >= 3 && y.startsWith(x))));
}
