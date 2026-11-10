"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseNumeroBR } from "@/lib/configuracoes";
import type { ItemCusto } from "@/lib/metas";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

function lerItens(texto: string): ItemCusto[] | null {
  try {
    const bruto = JSON.parse(texto) as { nome: string; valor: string }[];
    const itens = bruto
      .map((i) => ({ nome: String(i.nome ?? "").trim(), valor: parseNumeroBR(String(i.valor ?? "")) }))
      .filter((i) => i.nome || i.valor);
    if (itens.some((i) => !i.nome || i.valor == null || i.valor < 0)) return null;
    return itens.map((i) => ({ nome: i.nome, valor: Math.round((i.valor as number) * 100) / 100 }));
  } catch {
    return null;
  }
}

export async function salvarMeta(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();

  const mes = String(formData.get("mes") ?? "");
  if (!/^\d{4}-\d{2}-01$/.test(mes)) return falha("Mês inválido.");
  const custos = lerItens(String(formData.get("custos") ?? "[]"));
  const pessoas = lerItens(String(formData.get("pessoas") ?? "[]"));
  if (!custos || !pessoas) return falha("Confira os nomes e valores (ex.: Aluguel — 1.750,00).");

  const lucro = parseNumeroBR(String(formData.get("lucro_desejado") ?? "")) ?? 0;
  const insumos = parseNumeroBR(String(formData.get("insumos_pct") ?? "")) ?? 0;
  const ticketTexto = String(formData.get("ticket_alvo") ?? "").trim();
  const ticket = ticketTexto ? parseNumeroBR(ticketTexto) : null;

  if (lucro < 0) return falha("Lucro inválido.");
  if (insumos < 0 || insumos > 80) return falha("Insumos: use uma porcentagem entre 0 e 80.");
  if (ticket !== null && (ticket == null || ticket <= 0)) return falha("Ticket médio inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("metas").upsert({
    mes,
    custos,
    pessoas,
    lucro_desejado: Math.round(lucro * 100) / 100,
    insumos_pct: Math.round(insumos * 100) / 100,
    ticket_alvo: ticket,
  });
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/metas");
  revalidatePath("/");
  return sucesso();
}
