import Link from "next/link";
import { ListChecks } from "lucide-react";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/financeiro";
import { situacao } from "@/lib/tarefas";
import { lerTarefas } from "@/lib/tarefas-server";

/**
 * Lembrete fixo na Agenda (todos os dias): reservar 30 min para as tarefas do studio.
 * Só um aviso — não sugere horário nem ocupa a agenda.
 */
export async function LembreteTarefas() {
  const perfil = await getPerfil();
  const supabase = await createClient();
  const tarefas = await lerTarefas(supabase);
  const hoje = hojeISO();
  const pendentes = tarefas
    ? tarefas.filter((t) => {
        const s = situacao(t, hoje);
        return t.responsavel_id === perfil.id && s.doDia && !s.feita;
      }).length
    : null;

  return (
    <Link
      href="/checklist"
      className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-3 py-2.5 text-sm text-violet-950"
    >
      <ListChecks className="size-5 shrink-0 text-violet-700" />
      <span className="min-w-0 flex-1">
        <b>Lembrete: reserve 30 min do dia para as tarefas</b> · mandar as mensagens das clientes, fazer o
        checklist e responder as mensagens diretas.
        {pendentes != null && (
          <span className="block text-xs opacity-80">
            {pendentes === 0
              ? "Suas tarefas de hoje estão em dia."
              : `${pendentes} ${pendentes === 1 ? "tarefa sua pendente" : "tarefas suas pendentes"} hoje · abrir checklist`}
          </span>
        )}
      </span>
    </Link>
  );
}
