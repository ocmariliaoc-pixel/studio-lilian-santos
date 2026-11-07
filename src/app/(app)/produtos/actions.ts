"use server";

import { revalidatePath } from "next/cache";
import { getPerfil, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseNumeroBR } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarProduto(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "") || null;
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || "Outros";
  const preco = parseNumeroBR(String(formData.get("preco") ?? ""));
  const estoque = Number(formData.get("estoque"));
  const ativo = formData.get("ativo") === "on";

  if (!nome) return falha("Informe o nome do produto.");
  if (preco == null || preco < 0) return falha("Preço inválido. Exemplo: 29,90");
  if (!Number.isInteger(estoque) || estoque < 0) return falha("Estoque deve ser um número inteiro.");

  const dados = { nome, categoria, preco: Math.round(preco * 100) / 100, estoque, ativo };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("produtos").update(dados).eq("id", id)
    : await supabase.from("produtos").insert(dados);
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/produtos");
  return sucesso();
}

export async function registrarInventario(
  contagens: { produto_id: string; contado: number }[]
): Promise<AcaoState> {
  await getPerfil();
  if (contagens.some((c) => !Number.isInteger(c.contado) || c.contado < 0))
    return falha("As quantidades precisam ser números inteiros (0 ou mais).");

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_inventario", { contagens });
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/produtos");
  revalidatePath("/");
  return sucesso();
}
