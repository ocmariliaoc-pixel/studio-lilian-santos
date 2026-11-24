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
    const r = existe
      ? await supabase.from("servicos").update(dados).eq("id", existe.id)
      : await supabase.from("servicos").insert(dados);
    if (r.error) return r.error.message;
  }
  return null;
}

/**
 * Sobe a Black sozinha: na primeira vez que uma administradora abre o Início até 30/11,
 * se os serviços ainda não existem, eles são criados. Se já existem (mesmo desativados
 * por ela), não mexe — quem tira depois da Black é a administradora.
 */
export async function garantirBlackLS(supabase: SupabaseClient) {
  if (hojeISO() > BLACK_ULTIMO_DIA) return;
  const { data } = await supabase.from("servicos").select("nome").eq("categoria", CATEGORIA_BLACK);
  if ((data ?? []).length >= BLACK_LS.length) return;
  await gravarBlackLS(supabase);
}
