"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO, type TaxaPagamento } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export async function salvarTaxas(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();

  let taxas: TaxaPagamento[];
  try {
    taxas = JSON.parse(String(formData.get("taxas") ?? "[]"));
  } catch {
    return falha("Dados inválidos. Recarregue a página.");
  }

  for (const t of taxas) {
    if (!(t.forma in FORMAS_PAGAMENTO)) return falha("Forma de pagamento inválida.");
    if (typeof t.taxa_percentual !== "number" || t.taxa_percentual < 0 || t.taxa_percentual > 100) {
      const nome =
        t.forma === "credito_parcelado"
          ? `Crédito em ${t.parcelas}x`
          : FORMAS_PAGAMENTO[t.forma];
      return falha(`${nome}: a taxa deve ficar entre 0% e 100%.`);
    }
  }

  const supabase = await createClient();
  for (const t of taxas) {
    const { error } = await supabase
      .from("taxas_pagamento")
      .update({ taxa_percentual: Math.round(t.taxa_percentual * 100) / 100, ativo: t.ativo })
      .eq("forma", t.forma)
      .eq("parcelas", t.parcelas);
    if (error) return falha(mensagemErroBanco(error));
  }

  revalidatePath("/configuracoes/taxas");
  return sucesso();
}
