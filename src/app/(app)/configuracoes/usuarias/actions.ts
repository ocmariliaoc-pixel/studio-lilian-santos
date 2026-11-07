"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarUsuaria(_: AcaoState, formData: FormData): Promise<AcaoState> {
  const eu = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const papel = String(formData.get("papel") ?? "");
  const ativo = formData.get("ativo") === "on";

  if (!id) return falha("Usuária inválida.");
  if (!nome) return falha("Informe o nome.");
  if (papel !== "admin" && papel !== "profissional") return falha("Perfil inválido.");

  // Ninguém tira o próprio acesso de admin nem desativa a própria conta.
  if (id === eu.id && (papel !== "admin" || !ativo)) {
    return falha("Você não pode remover o seu próprio acesso. Peça a outra administradora.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("perfis").update({ nome, papel, ativo }).eq("id", id);
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/configuracoes/usuarias");
  revalidatePath("/", "layout");
  return sucesso();
}
