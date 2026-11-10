import { somarDias } from "@/lib/agenda";

export type ContaFixa = { id: string; nome: string; categoria: string; valor: number; dias: number[]; ativo: boolean };
export type Pagamento = { id: string; conta_fixa_id: string; vencimento: string; data: string; valor: number };

export type ContaDoMes = {
  conta: ContaFixa;
  vencimento: string; // AAAA-MM-DD
  pagamento: Pagamento | null;
  situacao: "paga" | "atrasada" | "hoje" | "a_vencer";
};

function ultimoDia(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Contas fixas do mês (AAAA-MM-01): um item por vencimento. Dia 30/31 vira o último dia em meses curtos. */
export function contasDoMes(contas: ContaFixa[], pagamentos: Pagamento[], mes: string, hoje: string): ContaDoMes[] {
  const fim = ultimoDia(mes);
  const lista: ContaDoMes[] = [];
  for (const c of contas.filter((x) => x.ativo)) {
    for (const d of c.dias) {
      const vencimento = `${mes.slice(0, 8)}${String(Math.min(d, fim)).padStart(2, "0")}`;
      const pagamento = pagamentos.find((p) => p.conta_fixa_id === c.id && p.vencimento === vencimento) ?? null;
      const situacao = pagamento ? "paga" : vencimento < hoje ? "atrasada" : vencimento === hoje ? "hoje" : "a_vencer";
      lista.push({ conta: c, vencimento, pagamento, situacao });
    }
  }
  return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.conta.nome.localeCompare(b.conta.nome));
}

export function proximosDias(hoje: string, n: number) {
  return somarDias(hoje, n);
}
