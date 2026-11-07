"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NovaSenhaState = { erro?: string };

export async function salvarSenha(_: NovaSenhaState, formData: FormData): Promise<NovaSenhaState> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmacao) return { erro: "As duas senhas não são iguais." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    if (error.code === "same_password") return { erro: "Escolha uma senha diferente da anterior." };
    if (error.code === "weak_password") return { erro: "Senha fraca. Use letras e números." };
    return { erro: "Não foi possível salvar. Peça um novo link e tente de novo." };
  }

  redirect("/?senha=ok");
}
