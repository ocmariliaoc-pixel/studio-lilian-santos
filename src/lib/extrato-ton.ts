/**
 * Leitor do "Extrato de conta corrente" da Ton/Stone em PDF (texto já extraído).
 * Cada movimento começa com "dd/mm/aa Entrada|Saída" e traz "R$ valor R$ saldo".
 */
export type MovimentoExtrato = {
  data: string; // AAAA-MM-DD
  tipo: "entrada" | "saida";
  descricao: string; // nome de quem pagou ou "Recebimento vendas"
  meio: string; // "Pix | Maquininha", "Antecipação | Crédito", ...
  valor: number; // sempre positivo
  saldo: number;
  contraparte: string;
  chave: string; // identifica o movimento (evita importar duas vezes)
};

const MEIOS = [
  "Pix | Maquininha",
  "Transferência | Pix",
  "Antecipação | Crédito",
  "Maestro | Débito",
  "Visa | Débito",
  "Elo | Débito",
  "Débito",
  "Crédito",
  "Pix",
  "Transferência",
  "Boleto",
  "Tarifa",
];

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

export function lerExtratoTon(texto: string): MovimentoExtrato[] {
  // Remove cabeçalhos/rodapés repetidos de cada página
  const limpo = texto
    .replace(/Extrato de conta corrente[\s\S]*?DATA TIPO DESCRIÇÃO VALOR SALDO CONTRAPARTE/g, "\n")
    .replace(/Informações do Comprovante[\s\S]*$/, "");

  const inicio = /(\d{2})\/(\d{2})\/(\d{2})\s+(Entrada|Saída|Saida)\b/g;
  const marcas: { i: number; m: RegExpExecArray }[] = [];
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(limpo))) marcas.push({ i: m.index, m });

  const movimentos: MovimentoExtrato[] = [];
  marcas.forEach(({ i, m }, k) => {
    const bloco = limpo.slice(i + m[0].length, k + 1 < marcas.length ? marcas[k + 1].i : undefined).replace(/\s+/g, " ").trim();
    const valores = /(-?)\s*R\$\s*(-?[\d.]+,\d{2})\s+(-?)\s*R\$\s*(-?[\d.]+,\d{2})/.exec(bloco);
    if (!valores) return;
    const antes = bloco.slice(0, valores.index).trim();
    const depois = bloco.slice(valores.index + valores[0].length).trim();
    const meio = MEIOS.find((x) => antes.endsWith(x) || antes.includes(` ${x}`) || antes.startsWith(x)) ?? "";
    const descricao = (meio ? antes.replace(meio, "") : antes).replace(/\s+/g, " ").trim();
    const tipo = /Sa[ií]da/.test(m[4]) || valores[1] === "-" || valores[2].startsWith("-") ? "saida" : "entrada";
    const valor = Math.abs(num(valores[2]));
    const saldo = num(valores[4]) * (valores[3] === "-" ? -1 : 1);
    const data = `20${m[3]}-${m[2]}-${m[1]}`;
    movimentos.push({
      data,
      tipo,
      descricao,
      meio,
      valor,
      saldo,
      contraparte: depois,
      chave: `${data}|${tipo}|${valor.toFixed(2)}|${saldo.toFixed(2)}`,
    });
  });
  return movimentos;
}

/** "Recebimento vendas" = repasse de cartão (crédito/débito), não é Pix de cliente. */
export function ehRepasseCartao(m: { descricao: string; meio: string | null }) {
  return /recebimento vendas/i.test(m.descricao) || /antecipa|d[ée]bito|cr[ée]dito/i.test(m.meio ?? "");
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

function tokens(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3 && !PARTICULAS.has(t));
}

/** "ANTONIA JOCELIA PEREIRA" × "Jocelia" → true (algum nome em comum, sem acento). */
export function nomesParecidos(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const tb = new Set(tokens(b));
  return tokens(a).some((t) => tb.has(t));
}

/**
 * Quanto um nome do caixa parece o nome do extrato: 0 = nada em comum;
 * 1 = só algum nome (ex.: sobrenome); 2 = o primeiro nome do caixa aparece no extrato.
 */
export function pontuacaoNome(extrato: string, caixa: string | null | undefined) {
  if (!caixa) return 0;
  const te = new Set(tokens(extrato));
  const tc = tokens(caixa);
  if (tc.length && te.has(tc[0])) return 2;
  return tc.some((t) => te.has(t)) ? 1 : 0;
}
