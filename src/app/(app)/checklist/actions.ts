"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDataISO } from "@/lib/financeiro";
import { ETIQUETAS, RECORRENCIAS } from "@/lib/tarefas";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

const UUID = /^[0-9a-f-]{36}$/i;

function revalidar() {
  revalidatePath("/checklist");
  revalidatePath("/");
  revalidatePath("/agenda");
}

export async function salvarTarefa(_: AcaoState, formData: FormData): Promise<AcaoState> {
  const perfil = await getPerfil();
  if (!perfil.ativo) return falha("Conta desativada.");

  const id = String(formData.get("id") ?? "") || null;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const detalhes = String(formData.get("detalhes") ?? "").trim() || null;
  const responsavel = String(formData.get("responsavel_id") ?? "");
  const etiqueta = String(formData.get("etiqueta") ?? "geral");
  const recorrencia = String(formData.get("recorrencia") ?? "unica");
  const diaTexto = String(formData.get("dia_semana") ?? "");
  const prazo = String(formData.get("prazo") ?? "") || null;

  if (!titulo) return falha("Escreva a tarefa. Ex.: Confirmar os atendimentos de amanhã");
  if (titulo.length > 140) return falha("Tarefa muito longa (até 140 letras). Use os detalhes.");
  if (!UUID.test(responsavel)) return falha("Escolha quem vai fazer.");
  if (!(etiqueta in ETIQUETAS)) return falha("Etiqueta inválida.");
  if (!(recorrencia in RECORRENCIAS)) return falha("Repetição inválida.");
  if (prazo && !isDataISO(prazo)) return falha("Data inválida.");
  const dia = recorrencia === "semanal" ? Number(diaTexto) : null;
  if (recorrencia === "semanal" && !(Number.isInteger(dia) && dia! >= 0 && dia! <= 6))
    return falha("Escolha o dia da semana.");

  const registro = {
    titulo,
    detalhes,
    responsavel_id: responsavel,
    etiqueta,
    recorrencia,
    dia_semana: dia,
    prazo: recorrencia === "unica" ? prazo : null,
  };

  const supabase = await createClient();
  const { error, count } = id
    ? await supabase.from("tarefas").update(registro, { count: "exact" }).eq("id", id)
    : await supabase.from("tarefas").insert({ ...registro, criado_por: perfil.id }, { count: "exact" });
  if (error) return falha(mensagemErroBanco(error));
  if (id && count === 0) return falha("Só quem pediu, quem faz ou a administração altera esta tarefa.");

  revalidar();
  return sucesso();
}

/** Marca ou desmarca a tarefa como feita naquele dia. */
export async function marcarTarefa(id: string, data: string, feita: boolean): Promise<AcaoState> {
  await getPerfil();
  if (!UUID.test(id) || !isDataISO(data)) return falha("Tarefa inválida.");
  const supabase = await createClient();
  const { error } = feita
    ? await supabase.from("tarefa_conclusoes").upsert({ tarefa_id: id, data }, { onConflict: "tarefa_id,data", ignoreDuplicates: true })
    : await supabase.from("tarefa_conclusoes").delete().eq("tarefa_id", id).eq("data", data);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}

/** Tira a tarefa da lista (fica no banco, sem excluir). */
export async function arquivarTarefa(id: string): Promise<AcaoState> {
  await getPerfil();
  if (!UUID.test(id)) return falha("Tarefa inválida.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("tarefas").update({ ativa: false }, { count: "exact" }).eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  if (count === 0) return falha("Só quem pediu, quem faz ou a administração tira esta tarefa.");
  revalidar();
  return sucesso();
}
