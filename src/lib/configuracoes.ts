/** Tipos e rótulos da Fase 2 (configurações e serviços). */

export type Servico = {
  id: string;
  nome: string;
  categoria: string;
  duracao_min: number;
  preco: number;
  retorno_dias: number | null;
  ativo: boolean;
};

export type Configuracoes = {
  intervalo_min: number;
  dias_cliente_inativa: number;
};

export type HorarioDia = {
  dia_semana: number;
  aberto: boolean;
  abre: string; // "HH:MM" ou "HH:MM:SS"
  fecha: string;
  pausa_inicio: string | null;
  pausa_fim: string | null;
};

export type FormaPagamento = "pix" | "dinheiro" | "debito" | "credito_vista" | "credito_parcelado";

export type TaxaPagamento = {
  forma: FormaPagamento;
  parcelas: number;
  taxa_percentual: number;
  ativo: boolean;
};

export const CATEGORIAS_SUGERIDAS = [
  "Facial",
  "Corporal",
  "Depilação",
  "Sobrancelha",
  "Cílios",
  "Massagem",
  "Outros",
];

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** Ordem de exibição: segunda primeiro, domingo no fim. */
export const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

export const FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito_vista: "Crédito à vista",
  credito_parcelado: "Crédito parcelado",
};

/** Valor líquido = bruto − taxa (%). Arredonda para centavos. */
export function valorLiquido(bruto: number, taxaPercentual: number) {
  return Math.round(bruto * (1 - taxaPercentual / 100) * 100) / 100;
}

/** "1h30", "45 min" */
export function formatDuracao(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "09:00:00" → "09:00" */
export function hhmm(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "";
}

/**
 * Converte texto digitado em número: "120", "120,5", "1.200,50", "R$ 80,00", "3.5".
 * Retorna null se não for um número válido.
 */
export function parseNumeroBR(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let s = String(texto).replace(/[R$\s%]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Número para campo de formulário em pt-BR: 120.5 → "120,50" */
export function numeroParaCampo(n: number | null | undefined, casas = 2) {
  if (n == null) return "";
  return n.toFixed(casas).replace(".", ",");
}
