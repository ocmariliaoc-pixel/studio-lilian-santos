"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizarInstagram, normalizarTelefone } from "@/lib/clientes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarContato(
  id: string,
  campo: "whatsapp" | "instagram",
  texto: string
): Promise<AcaoState & { valor?: string | null }> {
  await getPerfil();

  let valor: string | null = null;
  if (campo === "whatsapp") {
    valor = normalizarTelefone(texto) || null;
    if (valor && (valor.length < 10 || valor.length > 11))
      return falha("Telefone com DDD, ex.: (85) 99999-8888");
  } else {
    valor = normalizarInstagram(texto) || null;
    if (valor && !/^[a-z0-9._]{1,30}$/.test(valor)) return falha("Instagram inválido. Ex.: @studio.ls");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ [campo]: valor }).eq("id", id);
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/clientes");
  return { ...sucesso(), valor };
}
