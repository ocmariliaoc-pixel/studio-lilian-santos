"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDataISO } from "@/lib/financeiro";
import { MOTIVOS_PERDA, normalizarInstagram, normalizarTelefone, STATUS_CLIENTE } from "@/lib/clientes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

type Campo = "whatsapp" | "instagram" | "data_nascimento" | "status" | "motivo_perda";

/** Salva um campo da cliente direto da lista (telefone, Instagram, nascimento, status, motivo). */
export async function salvarCampoCliente(
  id: string,
  campo: Campo,
  texto: string
): Promise<AcaoState & { valor?: string | null }> {
  await getPerfil();

  let valor: string | null = texto.trim() || null;
  if (campo === "whatsapp") {
    valor = normalizarTelefone(texto) || null;
    if (valor && (valor.length < 10 || valor.length > 11))
      return falha("Telefone com DDD, ex.: (85) 99999-8888");
  } else if (campo === "instagram") {
    valor = normalizarInstagram(texto) || null;
    if (valor && !/^[a-z0-9._]{1,30}$/.test(valor)) return falha("Instagram inválido. Ex.: @studio.ls");
  } else if (campo === "data_nascimento") {
    if (valor && (!isDataISO(valor) || valor > new Date().toISOString().slice(0, 10) || valor < "1900-01-01"))
      return falha("Data de nascimento inválida.");
  } else if (campo === "status") {
    if (!valor || !(valor in STATUS_CLIENTE)) return falha("Status inválido.");
  } else if (campo === "motivo_perda") {
    if (valor && !MOTIVOS_PERDA.includes(valor) && valor.length > 120) return falha("Motivo muito longo.");
  } else {
    return falha("Campo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ [campo]: valor }).eq("id", id);
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/clientes");
  return { ...sucesso(), valor };
}

/** Junta dois cadastros da mesma cliente: o histórico de `sai` vai para `fica` e `sai` deixa de existir. */
export async function juntarClientes(fica: string, sai: string): Promise<AcaoState> {
  await getPerfil();
  if (!/^[0-9a-f-]{36}$/i.test(fica) || !/^[0-9a-f-]{36}$/i.test(sai)) return falha("Cliente inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("juntar_clientes", { p_fica: fica, p_sai: sai });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      return falha("Rode a migração 0014 no Supabase para poder juntar cadastros.");
    return falha(mensagemErroBanco(error));
  }
  revalidatePath("/clientes");
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  return sucesso();
}
