import { dataBR } from "@/lib/financeiro";

export type Acompanhamento = {
  cliente_id: string;
  cliente_nome: string;
  whatsapp: string | null;
  regra: string;
  regra_nome: string;
  mensagem: string;
  ordem: number;
  servico: string;
  atendido_em: string;
  mensagem_em: string;
  retorno_em: string | null;
  mensagem_enviada: boolean;
  proximo_agendamento: string | null;
};

export type Cupom = {
  id: string;
  cliente_id: string;
  descricao: string;
  percentual: number;
  valido_ate: string | null;
  origem: string | null;
  lembrado_em: string | null;
  usado_em: string | null;
  observacao: string | null;
};

/** Troca {nome}, {servico} e {retorno} no texto da regra. */
export function preencherMensagem(a: Pick<Acompanhamento, "mensagem" | "cliente_nome" | "servico" | "retorno_em">) {
  return a.mensagem
    .replaceAll("{nome}", a.cliente_nome.split(" ")[0])
    .replaceAll("{servico}", a.servico.toLocaleLowerCase("pt-BR"))
    .replaceAll("{retorno}", a.retorno_em ? dataBR(a.retorno_em).slice(0, 5) : "");
}

export function mensagemCupom(nome: string, c: Cupom) {
  const pct = Number(c.percentual) === 100 ? "de graça" : `com ${String(Number(c.percentual)).replace(".", ",")}% de desconto`;
  const ate = c.valido_ate ? `, válido até ${dataBR(c.valido_ate).slice(0, 5)}` : "";
  return `Oi, ${nome.split(" ")[0]}! Passando para lembrar: na inauguração do Studio Lilian Santos você ganhou ${c.descricao.toLocaleLowerCase("pt-BR")} ${pct}${ate} 🎈 Quer aproveitar? Posso reservar um horário para você 💛`;
}

export type SituacaoAcompanhamento = "enviada" | "agendada" | "atrasada" | "hoje" | "em_breve" | "futura";

export function situacao(a: Acompanhamento, hoje: string): SituacaoAcompanhamento {
  if (a.mensagem_enviada) return "enviada";
  if (a.proximo_agendamento) return "agendada";
  if (a.mensagem_em < hoje) return "atrasada";
  if (a.mensagem_em === hoje) return "hoje";
  const dias = Math.round((Date.parse(a.mensagem_em) - Date.parse(hoje)) / 86_400_000);
  return dias <= 7 ? "em_breve" : "futura";
}

/** Mensagens que precisam sair agora (hoje ou atrasadas, sem horário marcado). */
export function pendenteAgora(a: Acompanhamento, hoje: string) {
  const s = situacao(a, hoje);
  return s === "atrasada" || s === "hoje";
}

export function cupomValido(c: Cupom, hoje: string) {
  return !c.usado_em && (!c.valido_ate || c.valido_ate >= hoje);
}
