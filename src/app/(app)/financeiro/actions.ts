"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acharOuCriarCliente } from "@/lib/clientes-server";
import { FORMAS_PAGAMENTO, parseNumeroBR, type FormaPagamento } from "@/lib/configuracoes";
import { isDataISO } from "@/lib/financeiro";
import { normalizarTelefone } from "@/lib/clientes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarLancamento(_: AcaoState, formData: FormData): Promise<AcaoState> {
  const perfil = await getPerfil();
  if (!perfil.ativo) return falha("Conta desativada.");

  const id = String(formData.get("id") ?? "") || null;
  const tipo = String(formData.get("tipo") ?? "");
  const data = String(formData.get("data") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const clienteNome = String(formData.get("cliente_nome") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const valor = parseNumeroBR(String(formData.get("valor") ?? ""));
  const formaTexto = String(formData.get("forma_pagamento") ?? "");
  const parcelas = Number(formData.get("parcelas") ?? 1);
  const produtoTexto = String(formData.get("produto_id") ?? "");
  const quantidade = Number(formData.get("quantidade") ?? 1);
  const whatsapp = normalizarTelefone(String(formData.get("cliente_whatsapp") ?? "")) || null;

  if (tipo !== "entrada" && tipo !== "saida") return falha("Escolha entrada ou saída.");
  if (!isDataISO(data)) return falha("Data inválida.");
  if (valor == null || valor < 0) return falha("Valor inválido. Exemplo: 55,00");
  if (!descricao) return falha("Descreva o lançamento. Ex.: Design + buço");
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11))
    return falha("WhatsApp com DDD, ex.: (85) 99999-8888");

  let forma: FormaPagamento | null = null;
  if (tipo === "entrada" && valor > 0) {
    if (!(formaTexto in FORMAS_PAGAMENTO)) return falha("Escolha a forma de pagamento.");
    forma = formaTexto as FormaPagamento;
  }
  const nParcelas = forma === "credito_parcelado" ? parcelas : 1;
  if (forma === "credito_parcelado" && (!Number.isInteger(nParcelas) || nParcelas < 2 || nParcelas > 12))
    return falha("Escolha o número de parcelas.");

  const ehVendaProduto =
    tipo === "entrada" && (categoria === "Produto" || categoria === "Curso") && produtoTexto !== "";
  if (ehVendaProduto && !/^[0-9a-f-]{36}$/i.test(produtoTexto)) return falha("Produto inválido.");
  if (ehVendaProduto && (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999))
    return falha("Quantidade inválida.");

  const dados = {
    tipo,
    data,
    descricao,
    cliente_nome: tipo === "entrada" ? clienteNome : null,
    categoria,
    valor: Math.round(valor * 100) / 100,
    forma_pagamento: forma,
    parcelas: nParcelas,
    produto_id: ehVendaProduto ? produtoTexto : null,
    quantidade: ehVendaProduto ? quantidade : 1,
  };

  const supabase = await createClient();

  // Liga (ou cadastra) a cliente pelo nome. Se a tabela ainda não existir, segue só com o nome.
  const clienteId = dados.cliente_nome ? await acharOuCriarCliente(supabase, dados.cliente_nome) : null;
  const registro = clienteId ? { ...dados, cliente_id: clienteId } : dados;
  // Nova cliente: guarda o WhatsApp (sem apagar um número que já estava salvo)
  if (clienteId && whatsapp)
    await supabase.from("clientes").update({ whatsapp }).eq("id", clienteId).is("whatsapp", null);

  const { error, count } = id
    ? await supabase.from("lancamentos").update(registro, { count: "exact" }).eq("id", id)
    : await supabase.from("lancamentos").insert({ ...registro, criado_por: perfil.id }, { count: "exact" });

  if (error) return falha(mensagemErroBanco(error));
  if (id && count === 0) return falha("Você só pode corrigir lançamentos feitos por você.");

  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  revalidatePath("/clientes");
  return sucesso();
}

export async function alternarCancelamento(id: string, cancelado: boolean): Promise<AcaoState> {
  await getPerfil();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("lancamentos")
    .update({ cancelado }, { count: "exact" })
    .eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  if (count === 0) return falha("Você só pode cancelar lançamentos feitos por você.");
  revalidatePath("/financeiro");
  revalidatePath("/produtos");
  return sucesso();
}
