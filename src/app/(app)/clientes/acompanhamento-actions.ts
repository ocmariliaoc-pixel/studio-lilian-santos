"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDataISO, hojeISO } from "@/lib/financeiro";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

function revalidar() {
  revalidatePath("/clientes");
  revalidatePath("/");
}

/** Marca (ou desmarca) a mensagem de pós-atendimento como enviada. */
export async function marcarAcompanhamento(
  clienteId: string,
  regra: string,
  referencia: string,
  feito: boolean
): Promise<AcaoState> {
  await getPerfil();
  if (!isDataISO(referencia)) return falha("Data inválida.");
  const supabase = await createClient();
  const { error } = feito
    ? await supabase.from("acompanhamentos_feitos").upsert({ cliente_id: clienteId, regra, referencia })
    : await supabase
        .from("acompanhamentos_feitos")
        .delete()
        .eq("cliente_id", clienteId)
        .eq("regra", regra)
        .eq("referencia", referencia);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}

export async function atualizarCupom(id: string, acao: "lembrado" | "usado" | "desfazer_uso"): Promise<AcaoState> {
  await getPerfil();
  const supabase = await createClient();
  const dados =
    acao === "lembrado"
      ? { lembrado_em: new Date().toISOString() }
      : acao === "usado"
        ? { usado_em: hojeISO() }
        : { usado_em: null };
  const { error } = await supabase.from("cupons").update(dados).eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}
