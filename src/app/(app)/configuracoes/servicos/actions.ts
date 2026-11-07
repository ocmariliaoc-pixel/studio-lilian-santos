"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseNumeroBR } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarServico(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "") || null;
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || "Outros";
  const duracao = Number(formData.get("duracao_min"));
  const preco = parseNumeroBR(String(formData.get("preco") ?? ""));
  const retornoTexto = String(formData.get("retorno_dias") ?? "").trim();
  const retorno = retornoTexto ? Number(retornoTexto) : null;
  const ativo = formData.get("ativo") === "on";

  if (!nome) return falha("Informe o nome do serviço.");
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 600)
    return falha("Escolha a duração do serviço.");
  if (preco == null || preco < 0) return falha("Preço inválido. Exemplo: 120,00");
  if (retorno != null && (!Number.isInteger(retorno) || retorno < 1 || retorno > 730))
    return falha("Retorno deve ser um número de dias entre 1 e 730 (ou vazio).");

  const dados = {
    nome,
    categoria,
    duracao_min: duracao,
    preco: Math.round(preco * 100) / 100,
    retorno_dias: retorno,
    ativo,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("servicos").update(dados).eq("id", id)
    : await supabase.from("servicos").insert(dados);

  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/configuracoes/servicos");
  return sucesso();
}
