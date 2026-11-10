"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, isDataISO } from "@/lib/financeiro";
import { FORMAS_PAGAMENTO, parseNumeroBR, type FormaPagamento } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

function revalidar() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
}

/** Paga uma conta fixa: cria a saída no caixa ligada à conta e ao vencimento. */
export async function pagarConta(_: AcaoState, formData: FormData): Promise<AcaoState> {
  const perfil = await requireAdmin();
  const contaId = String(formData.get("conta_id") ?? "");
  const vencimento = String(formData.get("vencimento") ?? "");
  const data = String(formData.get("data") ?? "") || hojeISO();
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const forma = String(formData.get("forma") ?? "pix");
  if (!isDataISO(vencimento) || !isDataISO(data)) return falha("Data inválida.");
  if (valor == null || valor <= 0) return falha("Valor inválido.");
  if (!(forma in FORMAS_PAGAMENTO)) return falha("Forma de pagamento inválida.");

  const supabase = await createClient();
  const { data: conta } = await supabase.from("contas_fixas").select("nome, categoria").eq("id", contaId).single();
  if (!conta) return falha("Conta não encontrada.");
  const [a, m, d] = vencimento.split("-");
  const { error } = await supabase.from("lancamentos").insert({
    tipo: "saida",
    data,
    descricao: `${conta.nome} — venc. ${d}/${m}/${a}`,
    categoria: conta.categoria,
    valor: Math.round(valor * 100) / 100,
    forma_pagamento: forma as FormaPagamento,
    parcelas: 1,
    conta_fixa_id: contaId,
    vencimento,
    criado_por: perfil.id,
  });
  if (error) {
    if (error.code === "23505") return falha("Essa conta já foi paga.");
    return falha(mensagemErroBanco(error));
  }
  revalidar();
  return sucesso();
}

/** Desfaz o pagamento (cancela a saída no caixa). */
export async function desfazerPagamento(lancamentoId: string): Promise<AcaoState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").update({ cancelado: true }).eq("id", lancamentoId);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}

/** Cadastra ou altera uma conta fixa (valor de cada vencimento e dias do mês). */
export async function salvarContaFixa(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || "Outros";
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const dias = String(formData.get("dias") ?? "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number);
  const ativo = formData.get("ativo") !== "off";
  if (!nome) return falha("Informe o nome da conta.");
  if (valor == null || valor < 0) return falha("Valor inválido.");
  if (!dias.length || dias.some((d) => d < 1 || d > 31)) return falha("Dias de vencimento: números de 1 a 31 (ex.: 15, 30).");

  const supabase = await createClient();
  const dados = { nome, categoria, valor: Math.round(valor * 100) / 100, dias: [...new Set(dias)].sort((a, b) => a - b), ativo };
  const { error } = id
    ? await supabase.from("contas_fixas").update(dados).eq("id", id)
    : await supabase.from("contas_fixas").insert(dados);
  if (error) return falha(error.code === "23505" ? "Já existe uma conta com esse nome." : mensagemErroBanco(error));
  revalidar();
  return sucesso();
}
