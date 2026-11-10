import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, isDataISO } from "@/lib/financeiro";
import { dataLocal, inicioSemana, OFFSET, somarDias, type Agendamento } from "@/lib/agenda";
import { ultimoDiaDoMes } from "@/lib/metas";
import type { HorarioDia, Servico, TaxaPagamento } from "@/lib/configuracoes";
import { getPerfil } from "@/lib/auth";
import { situacao } from "@/lib/tarefas";
import { lerTarefas } from "@/lib/tarefas-server";
import { ErroMigracao } from "@/components/erro-migracao";
import { PageHeader } from "@/components/page-header";
import { AgendaTela } from "./agenda-tela";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; v?: string; a?: string; novo?: string }>;
}) {
  const sp = await searchParams;
  const hoje = hojeISO();
  const data = isDataISO(sp.d) ? sp.d : hoje;
  const visao = sp.v === "semana" ? "semana" : sp.v === "mes" ? "mes" : "dia";

  const inicioMes = `${data.slice(0, 7)}-01`;
  const fimMes = ultimoDiaDoMes(inicioMes);
  const de = visao === "semana" ? inicioSemana(data) : visao === "mes" ? inicioMes : data;
  const ate = visao === "semana" ? somarDias(de, 6) : visao === "mes" ? fimMes : data;
  // Sempre traz até 2 dias à frente de hoje, para o aviso de confirmação
  const ateBusca = [ate, somarDias(hoje, 2)].sort().at(-1)!;
  const deBusca = [de, hoje].sort()[0];

  const supabase = await createClient();
  const [ags, horarios, config, servicos, clientes, taxas, bloqueios] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, cliente_id, inicio, fim, fim_ocupado, status, valor_total, marcado_por, observacoes, cliente:clientes(nome, whatsapp), itens:agendamento_itens(servico_id, nome, duracao_min, valor, ordem), lancamentos(id)"
      )
      .gte("inicio", `${deBusca}T00:00:00${OFFSET}`)
      .lt("inicio", `${somarDias(ateBusca, 1)}T00:00:00${OFFSET}`)
      .order("inicio"),
    supabase.from("horarios_funcionamento").select("dia_semana, aberto, abre, fecha, pausa_inicio, pausa_fim"),
    supabase.from("configuracoes").select("intervalo_min").eq("id", 1).maybeSingle(),
    supabase
      .from("servicos")
      .select("id, nome, categoria, duracao_min, preco, retorno_dias, ativo")
      .eq("ativo", true)
      .order("categoria")
      .order("nome"),
    supabase.from("clientes").select("nome").order("nome"),
    supabase.from("taxas_pagamento").select("forma, parcelas, taxa_percentual, ativo"),
    supabase
      .from("bloqueios_agenda")
      .select("id, inicio, fim, motivo")
      .lt("inicio", `${somarDias(ateBusca, 1)}T00:00:00${OFFSET}`)
      .gt("fim", `${deBusca}T00:00:00${OFFSET}`),
  ]);

  if (ags.error || horarios.error) {
    return (
      <>
        <PageHeader titulo="Agenda" />
        <ErroMigracao arquivo="0007_agenda.sql" />
      </>
    );
  }

  // Etiqueta nova/ativa: primeira visita de cada cliente (caixa ou atendimento concluído)
  const ids = [...new Set((ags.data ?? []).map((a) => a.cliente_id as string))];
  const [visitasCaixa, visitasAgenda, perfil, tarefas] = await Promise.all([
    ids.length
      ? supabase.from("lancamentos").select("cliente_id, data").in("cliente_id", ids).eq("tipo", "entrada").eq("cancelado", false)
      : Promise.resolve({ data: [] as { cliente_id: string; data: string }[] }),
    ids.length
      ? supabase.from("agendamentos").select("cliente_id, inicio").in("cliente_id", ids).eq("status", "realizado")
      : Promise.resolve({ data: [] as { cliente_id: string; inicio: string }[] }),
    getPerfil(),
    lerTarefas(supabase),
  ]);
  const primeiraVisita = new Map<string, string>();
  const anotar = (id: string, d: string) => {
    const atual = primeiraVisita.get(id);
    if (!atual || d < atual) primeiraVisita.set(id, d);
  };
  for (const v of visitasCaixa.data ?? []) anotar(v.cliente_id, v.data);
  for (const v of visitasAgenda.data ?? []) anotar(v.cliente_id, dataLocal(v.inicio));
  const tarefasPendentes = (tarefas ?? []).filter((t) => {
    const s = situacao(t, hoje);
    return t.responsavel_id === perfil.id && s.doDia && !s.feita;
  }).length;

  const agendamentos: Agendamento[] = (ags.data ?? []).map((a) => {
    const cliente = a.cliente as unknown as { nome: string; whatsapp: string | null } | null;
    const itens = ((a.itens ?? []) as { servico_id: string | null; nome: string; duracao_min: number; valor: number; ordem: number }[])
      .sort((x, y) => x.ordem - y.ordem)
      .map((i) => ({ servico_id: i.servico_id, nome: i.nome, duracao_min: i.duracao_min, valor: Number(i.valor) }));
    return {
      id: a.id,
      cliente_id: a.cliente_id,
      cliente_nome: cliente?.nome ?? "—",
      cliente_whatsapp: cliente?.whatsapp ?? null,
      inicio: a.inicio,
      fim: a.fim,
      fim_ocupado: a.fim_ocupado,
      status: a.status,
      valor_total: Number(a.valor_total),
      marcado_por: a.marcado_por,
      observacoes: a.observacoes,
      itens,
      lancado: ((a.lancamentos as unknown[]) ?? []).length > 0,
      cliente_nova: !primeiraVisita.has(a.cliente_id) || primeiraVisita.get(a.cliente_id)! >= dataLocal(a.inicio),
    };
  });

  return (
    <AgendaTela
      hoje={hoje}
      data={data}
      visao={visao}
      de={de}
      agendamentos={agendamentos}
      horarios={(horarios.data ?? []) as HorarioDia[]}
      intervalo={config.data?.intervalo_min ?? 10}
      servicos={(servicos.data ?? []).map((s) => ({ ...s, preco: Number(s.preco) })) as Servico[]}
      clientes={(clientes.data ?? []).map((c) => c.nome)}
      taxas={(taxas.data ?? []).map((t) => ({ ...t, taxa_percentual: Number(t.taxa_percentual) })) as TaxaPagamento[]}
      bloqueios={bloqueios.data ?? []}
      abrirId={sp.a ?? null}
      abrirNovo={sp.novo === "1"}
      tarefasPendentes={tarefas ? tarefasPendentes : null}
    />
  );
}
