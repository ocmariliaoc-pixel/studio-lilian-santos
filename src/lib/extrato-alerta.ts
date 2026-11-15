// Lembrete do extrato da Ton: subir todo dia 15 e 30 (no mês sem dia 30, o último dia).
import { dataBR } from "@/lib/financeiro";
import { ultimoDiaDoMes } from "@/lib/metas";
import { somarDias } from "@/lib/agenda";

/** Os dois prazos do mês de `data` (aaaa-mm-dd): dia 15 e dia 30 (ou o último). */
function prazosDoMes(data: string) {
  const mes = `${data.slice(0, 7)}-01`;
  const ultimo = ultimoDiaDoMes(mes);
  const d30 = `${data.slice(0, 8)}${String(Math.min(30, Number(ultimo.slice(8)))).padStart(2, "0")}`;
  return [`${data.slice(0, 8)}15`, d30];
}

/** Prazo mais recente que já chegou (hoje incluso) e o próximo. */
export function prazosExtrato(hoje: string) {
  const [d15, d30] = prazosDoMes(hoje);
  if (hoje >= d30) return { atual: d30, proximo: prazosDoMes(somarDias(d30, 3))[0] };
  if (hoje >= d15) return { atual: d15, proximo: d30 };
  const anterior = prazosDoMes(somarDias(`${hoje.slice(0, 8)}01`, -1))[1];
  return { atual: anterior, proximo: d15 };
}

export type SituacaoExtrato = {
  /** precisa subir o extrato (o prazo chegou e ainda não foi enviado depois dele) */
  subir: boolean;
  atrasoDias: number;
  prazo: string;
  proximo: string;
  ultimoEnvio: string | null;
};

/**
 * Considera enviado se houve importação no dia do prazo ou depois, ou se o extrato já cobre
 * movimentos até a véspera do prazo (reenviar o mesmo PDF não cria movimentos novos).
 */
export function situacaoExtrato(hoje: string, ultimoEnvio: string | null, ultimoMovimento: string | null): SituacaoExtrato {
  const { atual, proximo } = prazosExtrato(hoje);
  const enviado = (!!ultimoEnvio && ultimoEnvio >= atual) || (!!ultimoMovimento && ultimoMovimento >= somarDias(atual, -1));
  const atrasoDias = Math.round((Date.parse(hoje) - Date.parse(atual)) / 86_400_000);
  return { subir: !enviado, atrasoDias, prazo: atual, proximo, ultimoEnvio };
}

export function textoPrazo(s: SituacaoExtrato) {
  if (!s.subir) return `Próximo envio: ${dataBR(s.proximo)}`;
  if (s.atrasoDias <= 0) return `Hoje (${dataBR(s.prazo)}) é dia de subir o extrato`;
  return `Era para ${dataBR(s.prazo)} · ${s.atrasoDias} ${s.atrasoDias === 1 ? "dia" : "dias"} de atraso`;
}
