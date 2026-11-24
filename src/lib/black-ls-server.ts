import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BLACK_LS, BLACK_ULTIMO_DIA, CATEGORIA_BLACK, DURACAO_PADRAO } from "@/lib/black-ls";
import { hojeISO } from "@/lib/financeiro";

/**
 * Cria (ou atualiza) os 7 serviços da Black LS. Duração = soma das durações dos serviços existentes.
 * Retorna mensagem de erro ou null. Usa o login de quem chama (só admin consegue gravar, pelo RLS).
 */
export async function gravarBlackLS(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.from("servicos").select("id, nome, categoria, duracao_min, preco");
  if (error) return error.message;
  const todos = (data ?? []).map((s) => ({ ...s, preco: Number(s.preco) }));
  const duracao = (parte: string) => {
    if (parte === "micro labial") {
      const micros = todos.filter((s) => s.categoria === "Micropigmentação · Lábios" && s.preco > 0);
      return micros.length ? Math.max(...micros.map((s) => s.duracao_min)) : DURACAO_PADRAO[parte];
    }
    return todos.find((s) => s.nome.toLowerCase() === parte)?.duracao_min ?? DURACAO_PADRAO[parte] ?? 60;
  };
  const novos: Record<string, unknown>[] = [];
  for (const b of BLACK_LS) {
    const dados = {
      nome: b.nome,
      categoria: CATEGORIA_BLACK,
      duracao_min: Math.min(600, b.partes.reduce((t, p) => t + duracao(p), 0)),
      preco: b.preco,
      retorno_dias: b.retorno,
      ativo: true,
    };
    const existe = todos.find((s) => s.nome.toLowerCase() === b.nome.toLowerCase());
    if (existe) {
      const r = await supabase.from("servicos").update(dados).eq("id", existe.id);
      if (r.error) return r.error.message;
    } else novos.push(dados);
  }
  // os que faltam vão num pedido só (menos chance de gravar duas vezes)
  if (novos.length) {
    const r = await supabase.from("servicos").insert(novos);
    if (r.error) return r.error.message;
  }
  return null;
}

/**
 * Sobe a Black sozinha: na primeira vez que uma administradora abre o Início até 30/11,
 * se os serviços ainda não existem, eles são criados. Se já existem (mesmo desativados
 * por ela), não mexe — quem tira depois da Black é a administradora.
 */
export async function garantirBlackLS(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, ativo, criado_em")
    .eq("categoria", CATEGORIA_BLACK)
    .order("criado_em");
  if (error) return error.message;
  const lista = data ?? [];
  // Repetidos (duas aberturas do Início ao mesmo tempo gravaram duas vezes): fica o primeiro de cada nome
  await limparRepetidos(supabase, lista);
  if (hojeISO() > BLACK_ULTIMO_DIA) return null;
  const nomes = new Set(lista.map((x) => String(x.nome).toLowerCase()));
  if (BLACK_LS.every((b) => nomes.has(b.nome.toLowerCase()))) return null;
  return gravarBlackLS(supabase);
}

/** Desativa os serviços repetidos (mesmo nome); mantém o mais antigo (e ativo, se houver). O histórico continua. */
async function limparRepetidos(
  supabase: SupabaseClient,
  lista: { id: string; nome: string; ativo: boolean; criado_em: string }[]
) {
  const porNome = new Map<string, typeof lista>();
  for (const s of lista) porNome.set(s.nome.toLowerCase(), [...(porNome.get(s.nome.toLowerCase()) ?? []), s]);
  const sobram: string[] = [];
  for (const grupo of porNome.values()) {
    if (grupo.length < 2) continue;
    const fica = grupo.find((g) => g.ativo) ?? grupo[0];
    for (const g of grupo) if (g.id !== fica.id && g.ativo) sobram.push(g.id);
  }
  if (sobram.length) await supabase.from("servicos").update({ ativo: false }).in("id", sobram);
}

/**
 * Correções de preço pedidas pelo studio, aplicadas uma vez quando uma administradora abre o Início
 * (sem precisar rodar SQL). Só mexe enquanto o preço antigo ainda estiver lá.
 *  - Lash Lifting: R$ 80 → R$ 120 (tabela + agendamentos ainda não concluídos que estavam com R$ 80).
 */
export async function aplicarCorrecoesDePreco(supabase: SupabaseClient) {
  const { data: lash } = await supabase.from("servicos").select("id, preco").ilike("nome", "lash lifting");
  for (const s of lash ?? []) {
    if (Number(s.preco) !== 80) continue;
    const r = await supabase.from("servicos").update({ preco: 120 }).eq("id", s.id);
    if (r.error) return;
    // agendamentos futuros (agendado/confirmado) com o item a R$ 80 → R$ 120 e total recalculado
    const { data: itens } = await supabase
      .from("agendamento_itens")
      .select("id, agendamento_id, agendamento:agendamentos(status)")
      .eq("servico_id", s.id)
      .eq("valor", 80);
    const abertos = (itens ?? []).filter((i) => {
      const st = (i.agendamento as unknown as { status: string } | null)?.status;
      return st === "agendado" || st === "confirmado";
    });
    if (!abertos.length) continue;
    await supabase.from("agendamento_itens").update({ valor: 120 }).in("id", abertos.map((i) => i.id));
    for (const agId of new Set(abertos.map((i) => i.agendamento_id as string))) {
      const { data: todos } = await supabase.from("agendamento_itens").select("valor").eq("agendamento_id", agId);
      const total = Math.round((todos ?? []).reduce((t, i) => t + Number(i.valor), 0) * 100) / 100;
      await supabase.from("agendamentos").update({ valor_total: total }).eq("id", agId);
    }
  }
}
