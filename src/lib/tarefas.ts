// Checklist da equipe: tipos, rótulos e o cálculo do que vence no dia (sem imports de servidor).
import { inicioSemana, somarDias } from "@/lib/agenda";

export type Etiqueta = "clientes_ativos" | "novos_clientes" | "geral";
export type Recorrencia = "unica" | "diaria" | "semanal";

export const ETIQUETAS: Record<Etiqueta, { rotulo: string; curto: string; classe: string }> = {
  clientes_ativos: {
    rotulo: "Clientes ativas",
    curto: "Ativas",
    classe: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  novos_clientes: {
    rotulo: "Novas clientes",
    curto: "Novas",
    classe: "border-violet-300 bg-violet-50 text-violet-900",
  },
  geral: { rotulo: "Studio", curto: "Studio", classe: "border-stone-300 bg-stone-50 text-stone-800" },
};

export const RECORRENCIAS: Record<Recorrencia, string> = {
  unica: "Uma vez",
  diaria: "Todo dia",
  semanal: "Toda semana",
};

export const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export type Tarefa = {
  id: string;
  titulo: string;
  detalhes: string | null;
  responsavel_id: string;
  responsavel_nome: string;
  criado_por: string;
  criado_por_nome: string;
  etiqueta: Etiqueta;
  recorrencia: Recorrencia;
  dia_semana: number | null;
  prazo: string | null;
  /** datas (aaaa-mm-dd) em que foi marcada como feita */
  conclusoes: string[];
};

export type SituacaoTarefa = {
  /** vence (ou venceu) até o dia de referência e conta no painel do dia */
  doDia: boolean;
  feita: boolean;
  atrasada: boolean;
  /** data usada para marcar/desmarcar */
  dataConclusao: string;
  quando: string;
};

/** O que a tarefa significa no dia `hoje`. */
export function situacao(t: Tarefa, hoje: string): SituacaoTarefa {
  if (t.recorrencia === "diaria") {
    const comecou = !t.prazo || t.prazo <= hoje;
    return {
      doDia: comecou,
      feita: t.conclusoes.includes(hoje),
      atrasada: false,
      dataConclusao: hoje,
      quando: "todo dia",
    };
  }
  if (t.recorrencia === "semanal") {
    const seg = inicioSemana(hoje);
    const dom = somarDias(seg, 6);
    const dow = t.dia_semana ?? 1;
    // dia da tarefa nesta semana (segunda a domingo)
    const dia = somarDias(seg, dow === 0 ? 6 : dow - 1);
    const feita = t.conclusoes.some((d) => d >= seg && d <= dom);
    return {
      doDia: dia <= hoje && (!t.prazo || t.prazo <= hoje),
      feita,
      atrasada: !feita && dia < hoje,
      dataConclusao: hoje,
      quando: `toda ${DIAS_SEMANA[dow]}`,
    };
  }
  const feita = t.conclusoes.length > 0;
  const feitaEm = [...t.conclusoes].sort().at(-1);
  return {
    // única: entra no dia a partir do prazo (ou já, sem prazo) até ser feita;
    // depois de feita, só aparece no dia em que foi feita
    doDia: feita ? feitaEm === hoje : !t.prazo || t.prazo <= hoje,
    feita,
    atrasada: !feita && !!t.prazo && t.prazo < hoje,
    dataConclusao: feitaEm ?? hoje,
    quando: t.prazo ? (t.prazo === hoje ? "hoje" : t.prazo < hoje ? "venceu" : "até") : "sem prazo",
  };
}

export type ResumoChecklist = {
  total: number;
  feitas: number;
  pendentes: number;
  atrasadas: number;
  porPessoa: { id: string; nome: string; total: number; feitas: number }[];
  porEtiqueta: { etiqueta: Etiqueta; total: number; feitas: number }[];
};

export function resumirChecklist(tarefas: Tarefa[], hoje: string): ResumoChecklist {
  const doDia = tarefas.map((t) => ({ t, s: situacao(t, hoje) })).filter((x) => x.s.doDia);
  const pessoas = new Map<string, { id: string; nome: string; total: number; feitas: number }>();
  const etiquetas = new Map<Etiqueta, { etiqueta: Etiqueta; total: number; feitas: number }>();
  for (const { t, s } of doDia) {
    const p = pessoas.get(t.responsavel_id) ?? { id: t.responsavel_id, nome: t.responsavel_nome, total: 0, feitas: 0 };
    p.total++;
    if (s.feita) p.feitas++;
    pessoas.set(t.responsavel_id, p);
    const e = etiquetas.get(t.etiqueta) ?? { etiqueta: t.etiqueta, total: 0, feitas: 0 };
    e.total++;
    if (s.feita) e.feitas++;
    etiquetas.set(t.etiqueta, e);
  }
  const feitas = doDia.filter((x) => x.s.feita).length;
  return {
    total: doDia.length,
    feitas,
    pendentes: doDia.length - feitas,
    atrasadas: doDia.filter((x) => x.s.atrasada).length,
    porPessoa: [...pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    porEtiqueta: (Object.keys(ETIQUETAS) as Etiqueta[])
      .map((e) => etiquetas.get(e))
      .filter((x): x is NonNullable<typeof x> => !!x),
  };
}

/** Sugestões para criar rápido, separadas pela etiqueta. */
export const MODELOS: { titulo: string; etiqueta: Etiqueta; recorrencia: Recorrencia }[] = [
  { titulo: "Mandar as mensagens de pós-atendimento do dia (Início)", etiqueta: "clientes_ativos", recorrencia: "diaria" },
  { titulo: "Confirmar os atendimentos de amanhã pelo WhatsApp", etiqueta: "clientes_ativos", recorrencia: "diaria" },
  { titulo: "Pedir avaliação no Google para quem foi atendida hoje", etiqueta: "clientes_ativos", recorrencia: "diaria" },
  { titulo: "Lembrar as clientes com desconto que ainda não usaram", etiqueta: "clientes_ativos", recorrencia: "semanal" },
  { titulo: "Responder os contatos novos do Instagram e WhatsApp", etiqueta: "novos_clientes", recorrencia: "diaria" },
  { titulo: "Mandar boas-vindas para quem veio pela primeira vez", etiqueta: "novos_clientes", recorrencia: "diaria" },
  { titulo: "Completar WhatsApp e nascimento das clientes novas", etiqueta: "novos_clientes", recorrencia: "semanal" },
  { titulo: "Postar nos stories (antes e depois, agenda livre)", etiqueta: "novos_clientes", recorrencia: "diaria" },
  { titulo: "Conferir o caixa do dia", etiqueta: "geral", recorrencia: "diaria" },
  { titulo: "Ver o que falta de insumos e produtos", etiqueta: "geral", recorrencia: "semanal" },
];
