import { TIMEZONE } from "@/lib/format";
import type { FormaPagamento } from "@/lib/configuracoes";

export type TipoLancamento = "entrada" | "saida";

export type Lancamento = {
  id: string;
  data: string; // AAAA-MM-DD
  tipo: TipoLancamento;
  descricao: string;
  cliente_nome: string | null;
  categoria: string | null;
  valor: number;
  forma_pagamento: FormaPagamento | null;
  parcelas: number;
  taxa_percentual: number;
  valor_liquido: number;
  cancelado: boolean;
  criado_por: string | null;
  autora: string | null;
  produto_id: string | null;
  quantidade: number;
};

export const CATEGORIAS_ENTRADA = ["Serviço", "Produto", "Curso", "Brinde", "Outro"];
export const CATEGORIAS_SAIDA = [
  "Pessoas",
  "Aluguel",
  "Energia/Água",
  "Contador/MEI",
  "Produtos/insumos",
  "Marketing e divulgação",
  "Serviços",
  "Impostos",
  "Equipamentos e móveis",
  "Reforma e estrutura",
  "Inauguração e divulgação",
  "Compras diversas",
  "Caução",
  "Outros",
];

/** Gastos únicos de abertura (não se repetem todo mês). */
export const CATEGORIAS_INVESTIMENTO = [
  "Equipamentos e móveis",
  "Reforma e estrutura",
  "Inauguração e divulgação",
  "Compras diversas",
  // nomes antigos
  "Montagem do studio",
  "Equipamentos",
];

/** Dinheiro guardado que volta (não é custo). */
export const CATEGORIAS_CAUCAO = ["Caução"];

export function grupoSaida(categoria: string | null): "operacional" | "investimento" | "caucao" {
  if (categoria && CATEGORIAS_CAUCAO.includes(categoria)) return "caucao";
  if (categoria && CATEGORIAS_INVESTIMENTO.includes(categoria)) return "investimento";
  return "operacional";
}

/** Converte a linha do Supabase (numeric chega como texto) para Lancamento. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lancamentoDaLinha(l: any): Lancamento {
  return {
    ...l,
    valor: Number(l.valor),
    taxa_percentual: Number(l.taxa_percentual),
    valor_liquido: Number(l.valor_liquido),
    autora: l.autora?.nome ?? null,
  };
}

// ---------------------------------------------------------------------------
// Datas (sempre no fuso de Fortaleza; datas como texto AAAA-MM-DD)
// ---------------------------------------------------------------------------

/** Hoje em Fortaleza, AAAA-MM-DD. */
export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(agora);
}

function partes(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return { a, m, d };
}

function iso(a: number, m: number, d: number) {
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function isDataISO(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export type TipoPeriodo = "dia" | "semana" | "mes" | "ano" | "total";

export type Periodo = {
  tipo: TipoPeriodo;
  ref: string;
  de: string;
  ate: string;
  titulo: string;
  anterior: string;
  proximo: string;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeMes(m: number) {
  return MESES[m - 1];
}

/** "sábado, 7 de novembro de 2026" a partir de AAAA-MM-DD (sem erro de fuso). */
export function dataExtensoISO(dataISO: string, comAno = true) {
  const { a, m, d } = partes(dataISO);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(comAno ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(a, m - 1, d)));
}

/** AAAA-MM-DD → dd/mm/aaaa */
export function dataBR(dataISO: string) {
  const { a, m, d } = partes(dataISO);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

export function calcularPeriodo(tipo: TipoPeriodo, ref: string): Periodo {
  const { a, m, d } = partes(ref);
  if (tipo === "dia") {
    return {
      tipo, ref, de: ref, ate: ref,
      titulo: dataExtensoISO(ref),
      anterior: iso(a, m, d - 1),
      proximo: iso(a, m, d + 1),
    };
  }
  if (tipo === "semana") {
    const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
    const seg = iso(a, m, d - (dow === 0 ? 6 : dow - 1));
    const [sa, sm, sd] = seg.split("-").map(Number);
    const dom = iso(sa, sm, sd + 6);
    const curto = (x: string) => `${x.slice(8)}/${x.slice(5, 7)}`;
    return {
      tipo, ref, de: seg, ate: dom,
      titulo: `Semana de ${curto(seg)} a ${curto(dom)}`,
      anterior: iso(sa, sm, sd - 7),
      proximo: iso(sa, sm, sd + 7),
    };
  }
  if (tipo === "total") {
    return { tipo, ref, de: "2000-01-01", ate: "2100-12-31", titulo: "Desde o início", anterior: ref, proximo: ref };
  }
  if (tipo === "mes") {
    return {
      tipo, ref,
      de: iso(a, m, 1),
      ate: iso(a, m + 1, 0),
      titulo: `${nomeMes(m)} de ${a}`,
      anterior: iso(a, m - 1, 1),
      proximo: iso(a, m + 1, 1),
    };
  }
  return {
    tipo, ref,
    de: iso(a, 1, 1),
    ate: iso(a, 12, 31),
    titulo: String(a),
    anterior: iso(a - 1, 1, 1),
    proximo: iso(a + 1, 1, 1),
  };
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export type Resumo = {
  entradasBruto: number;
  taxas: number;
  entradasLiquido: number;
  saidas: number;
  saidasInvestimento: number;
  saidasCaucao: number;
  saldo: number;
  qtdEntradas: number;
  brindes: number;
  porForma: { forma: FormaPagamento; bruto: number; taxas: number; liquido: number }[];
};

const centavos = (n: number) => Math.round(n * 100) / 100;

export function resumir(lancamentos: Lancamento[]): Resumo {
  const validos = lancamentos.filter((l) => !l.cancelado);
  const entradas = validos.filter((l) => l.tipo === "entrada");
  const saidas = validos.filter((l) => l.tipo === "saida");

  const entradasBruto = centavos(entradas.reduce((s, l) => s + l.valor, 0));
  const entradasLiquido = centavos(entradas.reduce((s, l) => s + l.valor_liquido, 0));
  const totalSaidas = centavos(saidas.reduce((s, l) => s + l.valor, 0));

  const mapa = new Map<FormaPagamento, { bruto: number; liquido: number }>();
  for (const l of entradas) {
    if (!l.forma_pagamento || l.valor === 0) continue;
    const atual = mapa.get(l.forma_pagamento) ?? { bruto: 0, liquido: 0 };
    mapa.set(l.forma_pagamento, {
      bruto: atual.bruto + l.valor,
      liquido: atual.liquido + l.valor_liquido,
    });
  }

  return {
    entradasBruto,
    taxas: centavos(entradasBruto - entradasLiquido),
    entradasLiquido,
    saidas: totalSaidas,
    saidasInvestimento: centavos(saidas.filter((l) => grupoSaida(l.categoria) === "investimento").reduce((s, l) => s + l.valor, 0)),
    saidasCaucao: centavos(saidas.filter((l) => grupoSaida(l.categoria) === "caucao").reduce((s, l) => s + l.valor, 0)),
    saldo: centavos(entradasLiquido - totalSaidas),
    qtdEntradas: entradas.filter((l) => l.valor > 0).length,
    brindes: entradas.filter((l) => l.valor === 0).length,
    porForma: [...mapa.entries()]
      .map(([forma, v]) => ({
        forma,
        bruto: centavos(v.bruto),
        liquido: centavos(v.liquido),
        taxas: centavos(v.bruto - v.liquido),
      }))
      .sort((x, y) => y.bruto - x.bruto),
  };
}

export function nomeForma(forma: FormaPagamento | null, parcelas: number, nomes: Record<string, string>) {
  if (!forma) return "—";
  return forma === "credito_parcelado" ? `Crédito ${parcelas}x` : nomes[forma];
}

// ---------------------------------------------------------------------------
// Balanço por mês
// ---------------------------------------------------------------------------
export type LinhaBalanco = {
  mes: string; // AAAA-MM
  entradas: number;
  taxas: number;
  liquido: number;
  diaADia: number;
  abertura: number;
  caucao: number;
  operacional: number; // líquido − dia a dia
  saldo: number; // líquido − todas as saídas
  acumulado: number;
};

export function balancoMensal(lancamentos: Lancamento[]): LinhaBalanco[] {
  const meses = new Map<string, Lancamento[]>();
  for (const l of lancamentos) {
    if (l.cancelado) continue;
    const k = l.data.slice(0, 7);
    meses.set(k, [...(meses.get(k) ?? []), l]);
  }
  let acumulado = 0;
  return [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, itens]) => {
      const r = resumir(itens);
      const diaADia = centavos(r.saidas - r.saidasInvestimento - r.saidasCaucao);
      acumulado = centavos(acumulado + r.saldo);
      return {
        mes,
        entradas: r.entradasBruto,
        taxas: r.taxas,
        liquido: r.entradasLiquido,
        diaADia,
        abertura: r.saidasInvestimento,
        caucao: r.saidasCaucao,
        operacional: centavos(r.entradasLiquido - diaADia),
        saldo: r.saldo,
        acumulado,
      };
    });
}
