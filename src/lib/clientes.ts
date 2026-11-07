import type { FormaPagamento } from "@/lib/configuracoes";

export type ClienteResumo = {
  id: string;
  nome: string;
  whatsapp: string | null;
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

/** Dias entre uma data AAAA-MM-DD e hoje (AAAA-MM-DD). */
export function diasDesde(dataISO: string, hojeISO: string) {
  return Math.round((Date.parse(hojeISO) - Date.parse(dataISO)) / 86_400_000);
}
