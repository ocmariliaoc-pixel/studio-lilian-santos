// Black LS (28, 29 e 30/11/2026) — serviços da promoção, conforme o post "BlackLS Stories".
// Combo = 2 procedimentos por um único valor. Duração = soma das durações dos serviços que já existem.

export const CATEGORIA_BLACK = "Black LS";
export const BLACK_ULTIMO_DIA = "2026-11-30";

/** Partes de cada serviço: nomes dos serviços existentes ("micro labial" = maior micro de lábios). */
export const BLACK_LS: { nome: string; preco: number; partes: string[]; retorno: number | null }[] = [
  { nome: "Black LS · Combo 1: Nanofios + Micro labial (sem retoque)", preco: 689.9, partes: ["nanofios", "micro labial"], retorno: null },
  { nome: "Black LS · Combo 2: Nanofios + Dermaplaning", preco: 599.9, partes: ["nanofios", "dermaplaning"], retorno: 30 },
  { nome: "Black LS · Combo 2: Nanofios + Lash lifting", preco: 599.9, partes: ["nanofios", "lash lifting"], retorno: 30 },
  { nome: "Black LS · Combo 3: Brow lamination + Dermaplaning", preco: 199.9, partes: ["brow lamination", "dermaplaning"], retorno: 45 },
  { nome: "Black LS · Combo 3: Brow lamination + Lash lifting", preco: 199.9, partes: ["brow lamination", "lash lifting"], retorno: 45 },
  { nome: "Black LS · Nanofios", preco: 489.9, partes: ["nanofios"], retorno: 30 },
  { nome: "Black LS · Shadow", preco: 349.9, partes: ["shadow"], retorno: 30 },
];

/** Duração padrão se o serviço não for encontrado (minutos). */
export const DURACAO_PADRAO: Record<string, number> = {
  nanofios: 90,
  "micro labial": 90,
  dermaplaning: 90,
  "lash lifting": 60,
  "brow lamination": 60,
  shadow: 90,
};
