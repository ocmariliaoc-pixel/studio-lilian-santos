import type { SupabaseClient } from "@supabase/supabase-js";
import type { Etiqueta, Recorrencia, Tarefa } from "@/lib/tarefas";

/** Tarefas ativas com nomes e conclusões. `null` = migração 0013 ainda não rodada. */
export async function lerTarefas(supabase: SupabaseClient): Promise<Tarefa[] | null> {
  const { data, error } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, detalhes, responsavel_id, criado_por, etiqueta, recorrencia, dia_semana, prazo, responsavel:perfis!tarefas_responsavel_id_fkey(nome), autora:perfis!tarefas_criado_por_fkey(nome), conclusoes:tarefa_conclusoes(data)"
    )
    .eq("ativa", true)
    .order("criado_em");
  if (error) return null;
  return (data ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    detalhes: t.detalhes,
    responsavel_id: t.responsavel_id,
    responsavel_nome: (t.responsavel as unknown as { nome: string } | null)?.nome ?? "—",
    criado_por: t.criado_por,
    criado_por_nome: (t.autora as unknown as { nome: string } | null)?.nome ?? "—",
    etiqueta: t.etiqueta as Etiqueta,
    recorrencia: t.recorrencia as Recorrencia,
    dia_semana: t.dia_semana,
    prazo: t.prazo,
    conclusoes: ((t.conclusoes ?? []) as { data: string }[]).map((c) => c.data),
  }));
}
