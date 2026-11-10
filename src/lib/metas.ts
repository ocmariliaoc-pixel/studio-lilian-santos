import { somarDias, diaDaSemana } from "@/lib/agenda";

export type ItemCusto = { nome: string; valor: number };

export type ParametrosMeta = {
  mes: string; // AAAA-MM-01
  custos: ItemCusto[];
  pessoas: ItemCusto[];
  lucro_desejado: number;
  insumos_pct: number;
  ticket_alvo: number | null;
  /** true se não existe meta salva para o mês e os números vieram do mês anterior */
  herdada: boolean;
};

export type ContextoMes = {
  taxaMediaPct: number; // taxa média da maquininha (últimos 90 dias)
  ticketReal: number | null; // ticket médio real dos serviços (últimos 90 dias)
  diasAbertosSemana: boolean[]; // índice 0..6 = domingo..sábado
  hoje: string;
  faturadoMes: number; // bruto do mês
  atendimentosMes: number;
  faturadoSemana: number; // semana atual (seg–dom)
};

const soma = (itens: ItemCusto[]) => itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
const centavos = (n: number) => Math.round(n * 100) / 100;

export function ultimoDiaDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/** Dias de atendimento (abertos) entre duas datas, inclusive. */
export function diasAbertos(de: string, ate: string, abertos: boolean[]) {
  let n = 0;
  for (let d = de; d <= ate; d = somarDias(d, 1)) if (abertos[diaDaSemana(d)]) n++;
  return n;
}

export function calcularMeta(p: ParametrosMeta, ctx: ContextoMes) {
  const custos = soma(p.custos);
  const pessoas = soma(p.pessoas);
  const precisa = custos + pessoas + p.lucro_desejado;
  const descontos = (ctx.taxaMediaPct + p.insumos_pct) / 100;
  const metaMes = centavos(precisa / Math.max(1 - descontos, 0.2));

  const fim = ultimoDiaDoMes(p.mes);
  const diasNoMes = Number(fim.slice(8, 10));
  const diasAtendimento = diasAbertos(p.mes, fim, ctx.diasAbertosSemana);
  const semanas = diasNoMes / 7;

  const ticket = p.ticket_alvo ?? ctx.ticketReal ?? 60;
  const atendimentosMes = Math.ceil(metaMes / ticket);

  // Progresso (só faz sentido no mês atual ou passado)
  const inicioRestante = ctx.hoje > p.mes ? ctx.hoje : p.mes;
  const diasRestantes = ctx.hoje > fim ? 0 : diasAbertos(inicioRestante, fim, ctx.diasAbertosSemana);
  const falta = Math.max(0, centavos(metaMes - ctx.faturadoMes));

  return {
    custos,
    pessoas,
    precisa,
    descontosPct: ctx.taxaMediaPct + p.insumos_pct,
    metaMes,
    metaSemana: centavos(metaMes / semanas),
    diasAtendimento,
    metaDia: diasAtendimento ? centavos(metaMes / diasAtendimento) : 0,
    ticket,
    ticketOrigem: p.ticket_alvo ? "definido" : ctx.ticketReal ? "real" : "estimado",
    atendimentosMes,
    atendimentosSemana: Math.ceil(atendimentosMes / semanas),
    atendimentosDia: diasAtendimento ? Math.round((atendimentosMes / diasAtendimento) * 10) / 10 : 0,
    progresso: metaMes ? Math.min(1, ctx.faturadoMes / metaMes) : 0,
    falta,
    diasRestantes,
    faltaPorDia: diasRestantes ? centavos(falta / diasRestantes) : falta,
    atendimentosFaltam: Math.max(0, atendimentosMes - ctx.atendimentosMes),
  };
}
