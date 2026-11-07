import type { FormaPagamento } from "@/lib/configuracoes";

export type ClienteResumo = {
  id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  status: "lead" | "ativa" | "inativa";
  ultima_visita: string | null;
  servicos_ultima_visita: string | null;
  ultimo_pagamento_em: string | null;
  ultimo_pagamento_valor: number | null;
  ultimo_pagamento_forma: FormaPagamento | null;
  ultimo_pagamento_parcelas: number | null;
  visitas: number;
  total_gasto: number;
};

/** Faixa de gasto para o indicador $ / $$ / $$$ (valores totais já pagos). */
export const FAIXAS_GASTO = [
  { min: 300, simbolo: "$$$", rotulo: "gasta muito" },
  { min: 100, simbolo: "$$", rotulo: "gasta bem" },
  { min: 0.01, simbolo: "$", rotulo: "já comprou" },
] as const;

export function faixaGasto(total: number) {
  return FAIXAS_GASTO.find((f) => total >= f.min) ?? null;
}

/** Telefone só com dígitos; tira o +55 do começo se vier com ele. */
export function normalizarTelefone(texto: string) {
  let d = texto.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d;
}

/** 85999998888 → (85) 99999-8888 */
export function formatTelefone(d: string | null) {
  if (!d) return "";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/** Link do WhatsApp (Brasil); null se o número não tiver DDD + número. */
export function linkWhatsApp(d: string | null, texto?: string) {
  if (!d || d.length < 10) return null;
  return `https://wa.me/55${d}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** "@lili.santos", "instagram.com/lili.santos/" → "lili.santos" */
export function normalizarInstagram(texto: string) {
  return texto
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
}

/** Dias entre uma data AAAA-MM-DD e hoje (AAAA-MM-DD). */
export function diasDesde(dataISO: string, hojeISO: string) {
  return Math.round((Date.parse(hojeISO) - Date.parse(dataISO)) / 86_400_000);
}
