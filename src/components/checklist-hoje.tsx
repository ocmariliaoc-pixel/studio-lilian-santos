import Link from "next/link";
import { ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resumirChecklist, situacao } from "@/lib/tarefas";
import { lerTarefas } from "@/lib/tarefas-server";
import { TarefaLinha } from "@/app/(app)/checklist/checklist-tela";
import { ChecklistPainel } from "@/components/checklist-painel";

/** Início: como está o checklist e as minhas tarefas pendentes do dia. */
export async function ChecklistHoje({ hoje, meuId }: { hoje: string; meuId: string }) {
  const supabase = await createClient();
  const tarefas = await lerTarefas(supabase);
  if (!tarefas || tarefas.length === 0) return null;
  const minhas = tarefas
    .filter((t) => t.responsavel_id === meuId)
    .map((t) => ({ t, s: situacao(t, hoje) }))
    .filter((x) => x.s.doDia && !x.s.feita)
    .sort((a, b) => Number(b.s.atrasada) - Number(a.s.atrasada));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ListChecks className="text-gold-dark size-4" /> Checklist do dia
        </h2>
        <Link href="/checklist" className="text-muted-foreground text-xs underline">
          abrir checklist
        </Link>
      </div>
      <ChecklistPainel resumo={resumirChecklist(tarefas, hoje)} compacto />
      {minhas.length > 0 && (
        <ul className="space-y-2">
          {minhas.slice(0, 5).map(({ t, s }) => (
            <li key={t.id}>
              <TarefaLinha tarefa={t} sit={s} hoje={hoje} meuId={meuId} />
            </li>
          ))}
          {minhas.length > 5 && (
            <li className="text-muted-foreground text-xs">
              + {minhas.length - 5} no <Link href="/checklist" className="underline">checklist</Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
