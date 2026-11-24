import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes";
import { grupoSaida, hojeISO, isDataISO } from "@/lib/financeiro";
import { DIA_DE_CURSO, diaDaSemana, ehSinal, somarDias } from "@/lib/agenda";
import { calcularMeta, ESCALAS, ultimoDiaDoMes, type ItemCusto } from "@/lib/metas";
import { contaComoAtendimento, ehItemServico, leadsPorOrigem, nomeCurso, prioridades, ranking } from "@/lib/resultados";

/*
 * Ferramentas da Lis (IA da administradora): consultas SÓ DE LEITURA, feitas com o login de quem
 * pergunta (o RLS do Supabase continua valendo). Devolvem números agregados; de clientes só o nome
 * e números (nunca telefone, e-mail, Instagram ou aniversário completo) — LGPD: o mínimo necessário.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function periodo(args: Record<string, unknown>, inicioPadrao: string) {
  const hoje = hojeISO();
  let de = typeof args.de === "string" && isDataISO(args.de) ? args.de : inicioPadrao;
  let ate = typeof args.ate === "string" && isDataISO(args.ate) ? args.ate : hoje;
  if (de > ate) [de, ate] = [ate, de];
  return { de, ate };
}

async function inicioDoStudio(sb: SupabaseClient) {
  const { data } = await sb.from("lancamentos").select("data").eq("cancelado", false).order("data").limit(1).maybeSingle();
  return (data?.data as string | undefined) ?? `${hojeISO().slice(0, 7)}-01`;
}

function somaPor<T>(lista: T[], chave: (x: T) => string, valor: (x: T) => number) {
  const m = new Map<string, number>();
  for (const x of lista) m.set(chave(x), (m.get(chave(x)) ?? 0) + valor(x));
  return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r2(v)]));
}

type Lanc = {
  tipo: string;
  data: string;
  valor: number;
  valor_liquido: number;
  categoria: string | null;
  descricao: string;
  forma_pagamento: string | null;
  cliente_nome: string | null;
  agendamento_id: string | null;
  produto_id: string | null;
  quantidade: number;
};

async function lancamentos(sb: SupabaseClient, de: string, ate: string): Promise<Lanc[]> {
  const { data, error } = await sb
    .from("lancamentos")
    .select("tipo, data, valor, valor_liquido, categoria, descricao, forma_pagamento, cliente_nome, agendamento_id, produto_id, quantidade")
    .eq("cancelado", false)
    .gte("data", de)
    .lte("data", ate)
    .limit(5000);
  if (error) throw new Error("Não consegui ler o caixa.");
  return (data ?? []).map((l) => ({ ...l, valor: Number(l.valor), valor_liquido: Number(l.valor_liquido), quantidade: Number(l.quantidade) || 1 })) as Lanc[];
}

// ---------------------------------------------------------------------------
async function financeiro(sb: SupabaseClient, args: Record<string, unknown>) {
  const { de, ate } = periodo(args, await inicioDoStudio(sb));
  const ls = await lancamentos(sb, de, ate);
  const ent = ls.filter((l) => l.tipo === "entrada");
  const sai = ls.filter((l) => l.tipo === "saida");
  const pagos = ent.filter((l) => l.valor > 0);
  const bruto = ent.reduce((t, l) => t + l.valor, 0);
  const liquido = ent.reduce((t, l) => t + l.valor_liquido, 0);
  const gasto = sai.reduce((t, l) => t + l.valor, 0);
  const meses = [...new Set(ls.map((l) => l.data.slice(0, 7)))].sort();
  return {
    periodo: { de, ate },
    entradas_bruto: r2(bruto),
    entradas_liquido: r2(liquido),
    taxas_maquininha: r2(bruto - liquido),
    saidas: r2(gasto),
    saldo_liquido_menos_saidas: r2(liquido - gasto),
    vendas_pagas: pagos.length,
    brindes_valor_zero: ent.length - pagos.length,
    por_mes: meses.map((m) => ({
      mes: m,
      entradas: r2(ent.filter((l) => l.data.startsWith(m)).reduce((t, l) => t + l.valor, 0)),
      liquido: r2(ent.filter((l) => l.data.startsWith(m)).reduce((t, l) => t + l.valor_liquido, 0)),
      saidas: r2(sai.filter((l) => l.data.startsWith(m)).reduce((t, l) => t + l.valor, 0)),
    })),
    entradas_por_forma: somaPor(pagos, (l) => (l.forma_pagamento ? FORMAS_PAGAMENTO[l.forma_pagamento as keyof typeof FORMAS_PAGAMENTO] ?? l.forma_pagamento : "sem forma"), (l) => l.valor),
    entradas_por_categoria: somaPor(pagos, (l) => l.categoria || "Outro", (l) => l.valor),
    saidas_por_categoria: somaPor(sai, (l) => l.categoria || "Outros", (l) => l.valor),
    saidas_por_natureza: somaPor(
      sai,
      (l) => ({ operacional: "dia a dia", investimento: "investimento de abertura", caucao: "caução (volta no fim do contrato)" })[grupoSaida(l.categoria)],
      (l) => l.valor
    ),
  };
}

// ---------------------------------------------------------------------------
async function atendimentos(sb: SupabaseClient, args: Record<string, unknown>) {
  const { de, ate } = periodo(args, await inicioDoStudio(sb));
  const ls = await lancamentos(sb, de, ate);
  const ent = ls.filter((l) => l.tipo === "entrada");
  const atend = ent.filter((l) => contaComoAtendimento(l));
  const servPagos = ent.filter((l) => l.categoria === "Serviço" && l.valor > 0);
  const { data: ags } = await sb
    .from("agendamentos")
    .select("inicio, fim, status, itens:agendamento_itens(nome, valor)")
    .gte("inicio", `${de}T00:00:00-03:00`)
    .lte("inicio", `${ate}T23:59:59-03:00`)
    .limit(5000);
  const agend = (ags ?? []) as { inicio: string; fim: string; status: string; itens: { nome: string; valor: number }[] }[];
  const status = somaPor(agend, (a) => (a.status === "realizado" ? "concluido" : a.status), () => 1);
  const validos = agend.filter((a) => a.status !== "cancelado");
  const itens = validos.flatMap((a) => a.itens ?? []);
  // Ocupação da agenda: horas marcadas ÷ horas abertas (agenda aberta 08:00–20:00 todos os dias)
  const horasMarcadas = validos.reduce((t, a) => t + (Date.parse(a.fim) - Date.parse(a.inicio)) / 3_600_000, 0);
  let dias = 0;
  for (let d = de; d <= ate; d = somarDias(d, 1)) dias++;
  return {
    periodo: { de, ate },
    atendimentos: atend.length,
    atendimentos_por_mes: somaPor(atend, (l) => l.data.slice(0, 7), () => 1),
    atendimentos_por_dia_da_semana: Object.fromEntries(SEMANA.map((n, i) => [n, atend.filter((l) => diaDaSemana(l.data) === i).length])),
    ticket_medio_servicos: servPagos.length ? r2(servPagos.reduce((t, l) => t + l.valor, 0) / servPagos.length) : 0,
    agendamentos_por_status: status,
    taxa_de_faltas_pct: agend.length ? Math.round(((status.faltou ?? 0) / agend.length) * 1000) / 10 : 0,
    taxa_de_cancelamento_pct: agend.length ? Math.round(((status.cancelado ?? 0) / agend.length) * 1000) / 10 : 0,
    ocupacao_agenda_pct: dias ? Math.round((horasMarcadas / (dias * 12)) * 1000) / 10 : 0,
    horas_marcadas: Math.round(horasMarcadas * 10) / 10,
    servicos_mais_procurados: ranking(
      [
        ...itens.filter((i) => ehItemServico(i.nome)).map((i) => ({ nome: i.nome, valor: Number(i.valor) })),
        ...ent
          .filter((l) => l.categoria === "Serviço" && !l.agendamento_id && !ehSinal(l.descricao) && !/a identificar/i.test(l.descricao))
          .flatMap((l) => l.descricao.replace(/\s*\(.*?\)\s*/g, " ").split(" + ").map((nome) => ({ nome }))),
      ],
      12
    ),
    cursos: ranking(
      [
        ...itens.filter((i) => /^curso\b/i.test(i.nome) && !DIA_DE_CURSO.test(i.nome)).map((i) => ({ nome: nomeCurso(i.nome), valor: Number(i.valor) })),
        ...ent.filter((l) => l.categoria === "Curso" && !l.agendamento_id && !ehSinal(l.descricao)).map((l) => ({ nome: nomeCurso(l.descricao), valor: l.valor })),
      ],
      8
    ),
  };
}

// ---------------------------------------------------------------------------
async function clientes(sb: SupabaseClient, args: Record<string, unknown>) {
  const hoje = hojeISO();
  const { de, ate } = periodo(args, await inicioDoStudio(sb));
  const [todas, cupons] = await Promise.all([
    sb.from("clientes_resumo").select("id, nome, status, origem, motivo_perda, whatsapp, criado_em, ultima_visita, proximo_agendamento, data_nascimento, visitas, total_gasto"),
    sb.from("cupons").select("cliente_id, percentual, descricao, valido_ate, usado_em"),
  ]);
  if (todas.error) throw new Error("Não consegui ler as clientes.");
  const cs = todas.data ?? [];
  const novas = cs.filter((c) => String(c.criado_em).slice(0, 10) >= de && String(c.criado_em).slice(0, 10) <= ate);
  const cup = (cupons.data ?? []).map((u) => ({ ...u, percentual: Number(u.percentual) }));
  const validos = cup.filter((u) => !u.usado_em && (!u.valido_ate || u.valido_ate >= hoje));
  return {
    periodo_cadastro: { de, ate },
    total_cadastradas: cs.length,
    funil_geral: somaPor(cs, (c) => ({ lead: "leads (possíveis)", ativa: "ganhas (ativas)", inativa: "inativas", perdido: "perdidas" })[c.status as string] ?? c.status, () => 1),
    leads_com_agendamento_futuro: cs.filter((c) => c.status === "lead" && c.proximo_agendamento).length,
    leads_sem_agendamento: cs.filter((c) => c.status === "lead" && !c.proximo_agendamento).length,
    sem_whatsapp_no_cadastro: cs.filter((c) => !c.whatsapp).length,
    motivos_de_perda: somaPor(cs.filter((c) => c.status === "perdido"), (c) => c.motivo_perda || "sem motivo", () => 1),
    novas_no_periodo_por_origem: leadsPorOrigem(novas as { origem: string | null; status: string }[]),
    descontos_validos: validos.length,
    descontos_vencendo_em_7_dias: validos.filter((u) => u.valido_ate && u.valido_ate <= somarDias(hoje, 7)).length,
    descontos_usados: cup.filter((u) => u.usado_em).length,
    quem_mais_gastou: [...cs]
      .sort((a, b) => Number(b.total_gasto) - Number(a.total_gasto))
      .slice(0, 10)
      .filter((c) => Number(c.total_gasto) > 0)
      .map((c) => ({ nome: c.nome, total_gasto: r2(Number(c.total_gasto)), visitas: Number(c.visitas), ultima_visita: c.ultima_visita })),
    prioridade_de_abordagem: prioridades(cs as Parameters<typeof prioridades>[0], cup, hoje, 12).map((p) => ({
      nome: p.nome,
      motivos: p.motivos,
    })),
    sumidas_mais_de_60_dias: cs.filter((c) => c.ultima_visita && !c.proximo_agendamento && c.ultima_visita <= somarDias(hoje, -60)).length,
  };
}

// ---------------------------------------------------------------------------
async function meta(sb: SupabaseClient, args: Record<string, unknown>) {
  const hoje = hojeISO();
  const mes = typeof args.mes === "string" && /^\d{4}-\d{2}$/.test(args.mes) ? `${args.mes}-01` : `${hoje.slice(0, 7)}-01`;
  const fim = ultimoDiaDoMes(mes);
  const escala = args.dias === "ter-dom" ? "ter-dom" : "ter-sab";
  const [m, fixas, rec, doMes] = await Promise.all([
    sb.from("metas").select("*").lte("mes", mes).order("mes", { ascending: false }).limit(1).maybeSingle(),
    sb.from("contas_fixas").select("nome, categoria, valor, dias").eq("ativo", true),
    sb.from("lancamentos").select("valor, valor_liquido, categoria").eq("tipo", "entrada").eq("cancelado", false).gt("valor", 0).gte("data", somarDias(hoje, -90)),
    sb.from("lancamentos").select("valor, categoria, descricao").eq("tipo", "entrada").eq("cancelado", false).gte("data", mes).lte("data", fim),
  ]);
  const fx = (fixas.data ?? []).map((c) => ({ nome: c.nome as string, valor: r2(Number(c.valor) * (c.dias as number[]).length), pessoas: c.categoria === "Pessoas" }));
  const extras = ((m.data?.custos as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) }));
  const extrasP = ((m.data?.pessoas as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) }));
  const r = rec.data ?? [];
  const bruto = r.reduce((t, l) => t + Number(l.valor), 0);
  const liq = r.reduce((t, l) => t + Number(l.valor_liquido), 0);
  const serv = r.filter((l) => l.categoria === "Serviço");
  const ent = doMes.data ?? [];
  const faturado = ent.reduce((t, l) => t + Number(l.valor), 0);
  const atendidos = ent.filter((l) => l.categoria === "Serviço" && Number(l.valor) > 0).length;
  const abertos = Array.from({ length: 7 }, (_, d) => (ESCALAS[escala].dias as readonly number[]).includes(d));
  const params = {
    mes,
    custos: [...fx.filter((f) => !f.pessoas), ...extras],
    pessoas: [...fx.filter((f) => f.pessoas), ...extrasP],
    lucro_desejado: Number(m.data?.lucro_desejado ?? 0),
    insumos_pct: Number(m.data?.insumos_pct ?? 0),
    ticket_alvo: m.data?.ticket_alvo ? Number(m.data.ticket_alvo) : null,
    herdada: !!m.data && m.data.mes !== mes,
  };
  const c = calcularMeta(params, {
    taxaMediaPct: bruto ? Math.round(((bruto - liq) / bruto) * 1000) / 10 : 3.6,
    ticketReal: serv.length ? r2(serv.reduce((t, l) => t + Number(l.valor), 0) / serv.length) : null,
    diasAbertosSemana: abertos,
    hoje,
    faturadoMes: faturado,
    atendimentosMes: atendidos,
    faturadoSemana: 0,
  });
  return {
    mes: mes.slice(0, 7),
    dias_de_atendimento: ESCALAS[escala].rotulo,
    custos: params.custos.map((i) => ({ nome: i.nome, valor: r2(i.valor) })),
    pessoas: params.pessoas.map((i) => ({ nome: i.nome, valor: r2(i.valor) })),
    lucro_desejado: params.lucro_desejado,
    insumos_pct: params.insumos_pct,
    taxa_media_maquininha_pct_90_dias: Math.round((c.descontosPct - params.insumos_pct) * 10) / 10,
    precisa_sobrar_no_mes: r2(c.precisa),
    meta_faturamento: c.metaMes,
    faturado_no_mes: r2(faturado),
    percentual_da_meta: c.metaMes ? Math.round((faturado / c.metaMes) * 100) : 0,
    falta: c.falta,
    dias_de_atendimento_no_mes: c.diasAtendimento,
    dias_de_atendimento_restantes: c.diasRestantes,
    falta_por_dia_restante: c.faltaPorDia,
    meta_por_semana: c.metaSemana,
    meta_por_dia: c.metaDia,
    ticket_usado: c.ticket,
    origem_do_ticket: c.ticketOrigem,
    atendimentos_necessarios_no_mes: c.atendimentosMes,
    atendimentos_feitos_no_mes: atendidos,
    atendimentos_que_faltam: c.atendimentosFaltam,
  };
}

// ---------------------------------------------------------------------------
async function produtos(sb: SupabaseClient, args: Record<string, unknown>) {
  const { de, ate } = periodo(args, await inicioDoStudio(sb));
  const [ps, ls] = await Promise.all([
    sb.from("produtos").select("id, nome, categoria, preco, estoque, controla_estoque, ativo"),
    lancamentos(sb, de, ate),
  ]);
  const vendas = ls.filter((l) => l.tipo === "entrada" && l.categoria === "Produto");
  const lista = (ps.data ?? []).filter((p) => p.ativo);
  return {
    periodo: { de, ate },
    vendas_de_produto_valor: r2(vendas.reduce((t, l) => t + l.valor, 0)),
    produtos: lista
      .map((p) => {
        const v = vendas.filter((l) => l.produto_id === p.id);
        return {
          nome: p.nome,
          categoria: p.categoria,
          preco: Number(p.preco),
          estoque: p.controla_estoque ? p.estoque : "sem estoque (curso/serviço)",
          vendidos_no_periodo: v.reduce((t, l) => t + l.quantidade, 0),
          valor_vendido: r2(v.reduce((t, l) => t + l.valor, 0)),
        };
      })
      .sort((a, b) => b.vendidos_no_periodo - a.vendidos_no_periodo),
  };
}

// ---------------------------------------------------------------------------
async function contasAPagar(sb: SupabaseClient, args: Record<string, unknown>) {
  const hoje = hojeISO();
  const mes = typeof args.mes === "string" && /^\d{4}-\d{2}$/.test(args.mes) ? `${args.mes}-01` : `${hoje.slice(0, 7)}-01`;
  const fim = ultimoDiaDoMes(mes);
  const [cf, pagos] = await Promise.all([
    sb.from("contas_fixas").select("id, nome, categoria, valor, dias").eq("ativo", true),
    sb.from("lancamentos").select("conta_fixa_id, vencimento, valor").eq("cancelado", false).gte("vencimento", mes).lte("vencimento", fim),
  ]);
  const ult = Number(fim.slice(8, 10));
  const itens = (cf.data ?? []).flatMap((c) =>
    (c.dias as number[]).map((d) => {
      const venc = `${mes.slice(0, 8)}${String(Math.min(d, ult)).padStart(2, "0")}`;
      const pago = (pagos.data ?? []).some((p) => p.conta_fixa_id === c.id && p.vencimento === venc);
      return { conta: c.nome, categoria: c.categoria, vencimento: venc, valor: Number(c.valor), situacao: pago ? "paga" : venc < hoje ? "atrasada" : "a pagar" };
    })
  );
  return {
    mes: mes.slice(0, 7),
    total: r2(itens.reduce((t, i) => t + i.valor, 0)),
    pago: r2(itens.filter((i) => i.situacao === "paga").reduce((t, i) => t + i.valor, 0)),
    falta_pagar: r2(itens.filter((i) => i.situacao !== "paga").reduce((t, i) => t + i.valor, 0)),
    atrasadas: itens.filter((i) => i.situacao === "atrasada").length,
    contas: itens.sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
  };
}

// ---------------------------------------------------------------------------
async function agendaProxima(sb: SupabaseClient, args: Record<string, unknown>) {
  const hoje = hojeISO();
  const n = Math.min(Math.max(Number(args.dias) || 7, 1), 60);
  const ate = somarDias(hoje, n - 1);
  const { data } = await sb
    .from("agendamentos")
    .select("inicio, fim, status, valor_total")
    .in("status", ["agendado", "confirmado"])
    .gte("inicio", `${hoje}T00:00:00-03:00`)
    .lte("inicio", `${ate}T23:59:59-03:00`);
  const ags = (data ?? []) as { inicio: string; fim: string; status: string; valor_total: number }[];
  const dia = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date(iso));
  const dias = Array.from({ length: n }, (_, i) => somarDias(hoje, i)).map((d) => {
    const doDia = ags.filter((a) => dia(a.inicio) === d);
    const horas = doDia.reduce((t, a) => t + (Date.parse(a.fim) - Date.parse(a.inicio)) / 3_600_000, 0);
    return {
      data: d,
      dia_da_semana: SEMANA[diaDaSemana(d)],
      agendamentos: doDia.length,
      nao_confirmados: doDia.filter((a) => a.status === "agendado").length,
      horas_marcadas: Math.round(horas * 10) / 10,
      horas_livres_aprox: Math.max(0, Math.round((12 - horas) * 10) / 10),
    };
  });
  return {
    de: hoje,
    ate,
    total_agendamentos: ags.length,
    nao_confirmados: ags.filter((a) => a.status === "agendado").length,
    valor_previsto: r2(ags.reduce((t, a) => t + Number(a.valor_total), 0)),
    por_dia: dias,
  };
}

// ---------------------------------------------------------------------------
const PERIODO = {
  type: "object",
  properties: {
    de: { type: "string", description: "Data inicial aaaa-mm-dd. Omitir = desde a abertura do studio." },
    ate: { type: "string", description: "Data final aaaa-mm-dd. Omitir = hoje." },
  },
  additionalProperties: false,
} as const;
const MES = {
  type: "object",
  properties: { mes: { type: "string", description: "Mês aaaa-mm. Omitir = mês atual." } },
  additionalProperties: false,
} as const;

export const FERRAMENTAS_LIS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: "financeiro",
    description:
      "Caixa do studio num período: entradas (bruto, líquido, taxas), saídas, saldo, por mês, por forma de pagamento, por categoria e por natureza das saídas (dia a dia, investimento, caução). Use para perguntas de dinheiro, lucro, custos, gastos e comparações entre meses.",
    input_schema: PERIODO,
  },
  {
    name: "atendimentos",
    description:
      "Atendimentos num período: quantidade, por mês e dia da semana, ticket médio, status dos agendamentos (concluídos, faltas, cancelados), taxa de faltas, ocupação da agenda (horas marcadas ÷ 12h por dia), serviços mais procurados e cursos.",
    input_schema: PERIODO,
  },
  {
    name: "clientes",
    description:
      "Clientes e leads: funil (leads, ganhas, inativas, perdidas), leads com/sem agendamento, motivos de perda, novas no período por origem, descontos válidos/vencendo/usados, quem mais gastou e a lista de prioridade de abordagem (nomes e motivos, sem contatos). O período filtra só as novas cadastradas.",
    input_schema: PERIODO,
  },
  {
    name: "meta",
    description:
      "Meta de faturamento do mês: custos, pessoas, lucro desejado, taxas, meta, faturado, % da meta, quanto falta por dia de atendimento restante, ticket e atendimentos necessários x feitos.",
    input_schema: {
      type: "object",
      properties: {
        mes: { type: "string", description: "Mês aaaa-mm. Omitir = mês atual." },
        dias: { type: "string", enum: ["ter-sab", "ter-dom"], description: "Dias de atendimento considerados (padrão terça a sábado)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "produtos",
    description: "Produtos ativos: preço, estoque e quanto vendeu no período (quantidade e valor). Use para estoque, reposição e o que vende mais ou menos.",
    input_schema: PERIODO,
  },
  {
    name: "contas_a_pagar",
    description: "Contas fixas do mês com vencimento, valor e situação (paga, a pagar, atrasada) e totais.",
    input_schema: MES,
  },
  {
    name: "agenda_proxima",
    description: "Agenda dos próximos dias (a partir de hoje): agendamentos por dia, não confirmados, horas marcadas e livres, valor previsto.",
    input_schema: {
      type: "object",
      properties: { dias: { type: "integer", description: "Quantos dias olhar para frente (1 a 60). Padrão 7." } },
      additionalProperties: false,
    },
  },
];

const EXECUTORES: Record<string, (sb: SupabaseClient, args: Record<string, unknown>) => Promise<unknown>> = {
  financeiro,
  atendimentos,
  clientes,
  meta,
  produtos,
  contas_a_pagar: contasAPagar,
  agenda_proxima: agendaProxima,
};

export const ROTULO_FERRAMENTA: Record<string, string> = {
  financeiro: "Olhando o caixa",
  atendimentos: "Olhando os atendimentos",
  clientes: "Olhando as clientes",
  meta: "Olhando a meta",
  produtos: "Olhando os produtos",
  contas_a_pagar: "Olhando as contas a pagar",
  agenda_proxima: "Olhando a agenda",
};

export async function executarFerramenta(sb: SupabaseClient, nome: string, entrada: unknown) {
  const fn = EXECUTORES[nome];
  if (!fn) return { erro: `Ferramenta desconhecida: ${nome}` };
  const args = entrada && typeof entrada === "object" && !Array.isArray(entrada) ? (entrada as Record<string, unknown>) : {};
  try {
    return await fn(sb, args);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não consegui consultar agora." };
  }
}
