import type { Metadata } from "next";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/financeiro";
import { resumirChecklist } from "@/lib/tarefas";
import { lerTarefas } from "@/lib/tarefas-server";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { ChecklistPainel } from "@/components/checklist-painel";
import { ChecklistTela } from "./checklist-tela";

export const metadata: Metadata = { title: "Checklist" };

export default async function ChecklistPage() {
  const perfil = await getPerfil();
  const hoje = hojeISO();
  const supabase = await createClient();
  const [tarefas, pessoas] = await Promise.all([
    lerTarefas(supabase),
    supabase.from("perfis").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  if (!tarefas) {
    return (
      <>
        <PageHeader titulo="Checklist" />
        <ErroMigracao arquivo="0013_checklist.sql" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Checklist"
        descricao="Tarefas da equipe: Ana Jessica pede para Lilian e vice-versa. Reserve 30 min do dia para elas."
      />
      <ChecklistPainel resumo={resumirChecklist(tarefas, hoje)} />
      <ChecklistTela
        tarefas={tarefas}
        pessoas={pessoas.data ?? []}
        meuId={perfil.id}
        admin={isAdmin(perfil)}
        hoje={hoje}
      />
    </>
  );
}
