"use server";

import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acharOuCriarCliente } from "@/lib/clientes-server";
import { ehRepasseCartao, lerExtratoTon, pontuacaoNome } from "@/lib/extrato-ton";
import { somarDias } from "@/lib/agenda";
import { falha, mensagemErroBanco, type AcaoState } from "@/lib/acoes";

export type ImportacaoState = AcaoState & { resumo?: string };

function revalidar() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/clientes");
}

/** Importa o PDF do extrato da Ton e concilia com o caixa (mesmo valor, até 7 dias de diferença). */
export async function importarExtrato(_: ImportacaoState, formData: FormData): Promise<ImportacaoState> {
  await requireAdmin();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return falha("Escolha o PDF do extrato.");
  if (arquivo.size > 5 * 1024 * 1024) return falha("Arquivo muito grande (máximo 5 MB).");

  let movimentos;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    movimentos = lerExtratoTon(text as string);
  } catch {
    return falha("Não consegui ler esse PDF. Use o extrato de conta corrente da Ton.");
  }
  if (movimentos.length === 0) return falha("Nenhum movimento encontrado no PDF.");

  const supabase = await createClient();
  const { data: inseridos, error } = await supabase
    .from("extrato_movimentos")
    .upsert(
      movimentos.map(({ chave, data, tipo, descricao, meio, valor, saldo, contraparte }) => ({
        chave, data, tipo, descricao, meio, valor, saldo, contraparte,
      })),
      { onConflict: "chave", ignoreDuplicates: true }
    )
    .select("id");
  if (error) return falha(mensagemErroBanco(error));

  const conciliados = await conciliarAutomatico();
  revalidar();
  const novos = inseridos?.length ?? 0;
  return {
    ok: true,
    em: Date.now(),
    resumo: `${movimentos.length} movimentos no PDF · ${novos} novos · ${movimentos.length - novos} já importados · ${conciliados} conferidos com o caixa agora`,
  };
}

/** Liga movimentos do banco a lançamentos do caixa (Pix/transferência: mesmo valor, ±7 dias). */
async function conciliarAutomatico() {
  const supabase = await createClient();
  const { data: pendentes } = await supabase
    .from("extrato_movimentos")
    .select("id, data, valor, descricao, meio, tipo")
    .is("lancamento_id", null)
    .eq("ignorado", false)
    .order("data");
  const { data: jaLigados } = await supabase.from("extrato_movimentos").select("lancamento_id").not("lancamento_id", "is", null);
  const usados = new Set((jaLigados ?? []).map((x) => x.lancamento_id as string));
  let n = 0;
  for (const m of pendentes ?? []) {
    if (m.tipo !== "entrada" || ehRepasseCartao(m)) continue;
    const { data: candidatos } = await supabase
      .from("lancamentos")
      .select("id, data, cliente_nome, cliente:clientes(nome)")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .eq("valor", m.valor)
      .in("forma_pagamento", ["pix", "dinheiro"])
      .gte("data", somarDias(m.data, -7))
      .lte("data", somarDias(m.data, 7));
    const nomeDe = (c: { cliente_nome: string | null; cliente: unknown }) =>
      (c.cliente as { nome?: string } | null)?.nome ?? c.cliente_nome ?? "";
    const nota = (c: { cliente_nome: string | null; cliente: unknown }) =>
      Math.max(pontuacaoNome(m.descricao, c.cliente_nome), pontuacaoNome(m.descricao, nomeDe(c)));
    const distancia = (d: string) => Math.abs(Date.parse(d) - Date.parse(m.data));
    // melhor nome primeiro; empate → data mais próxima
    const escolhido = (candidatos ?? [])
      .filter((c) => !usados.has(c.id))
      .sort((a, b) => nota(b) - nota(a) || distancia(a.data) - distancia(b.data))[0];
    if (escolhido) {
      await supabase.from("extrato_movimentos").update({ lancamento_id: escolhido.id }).eq("id", m.id);
      usados.add(escolhido.id);
      n++;
      continue;
    }
    // Venda dividida no caixa (ex.: brincos + design no mesmo Pix): soma dos lançamentos da mesma cliente
    const { data: daCliente } = await supabase
      .from("lancamentos")
      .select("id, valor, cliente_nome, cliente_id, cliente:clientes(nome)")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .in("forma_pagamento", ["pix", "dinheiro"])
      .gte("data", somarDias(m.data, -7))
      .lte("data", somarDias(m.data, 7));
    const grupos = new Map<string, NonNullable<typeof daCliente>>();
    for (const c of daCliente ?? []) {
      if (usados.has(c.id) || nota(c) === 0) continue;
      const k = c.cliente_id ?? nomeDe(c);
      grupos.set(k, [...(grupos.get(k) ?? []), c]);
    }
    const grupo = [...grupos.values()]
      .filter((g) => g.length > 1 && Math.round(g.reduce((t, c) => t + Number(c.valor), 0) * 100) / 100 === Number(m.valor))
      .sort((a, b) => nota(b[0]) - nota(a[0]))[0];
    if (grupo) {
      await supabase.from("extrato_movimentos").update({ lancamento_id: grupo[0].id }).eq("id", m.id);
      grupo.forEach((c) => usados.add(c.id));
      n++;
    }
  }
  return n;
}

/** Lança no caixa um Pix que só aparece no banco (entrada por Pix, cliente = nome do extrato). */
export async function lancarDoExtrato(movimentoId: string): Promise<AcaoState> {
  const perfil = await requireAdmin();
  const supabase = await createClient();
  const { data: m } = await supabase.from("extrato_movimentos").select("*").eq("id", movimentoId).single();
  if (!m) return falha("Movimento não encontrado.");
  if (m.lancamento_id) return falha("Esse movimento já está no caixa.");
  const nome = String(m.descricao)
    .toLowerCase()
    .replace(/(^|\s)\S/g, (x: string) => x.toUpperCase());
  const clienteId = await acharOuCriarCliente(supabase, nome);
  const { data: l, error } = await supabase
    .from("lancamentos")
    .insert({
      tipo: m.tipo,
      data: m.data,
      descricao: "Recebimento — serviço a confirmar (do extrato)",
      cliente_nome: nome,
      cliente_id: clienteId,
      categoria: "Serviço",
      valor: m.valor,
      forma_pagamento: "pix",
      criado_por: perfil.id,
    })
    .select("id")
    .single();
  if (error || !l) return falha(mensagemErroBanco(error));
  await supabase.from("extrato_movimentos").update({ lancamento_id: l.id }).eq("id", movimentoId);
  revalidar();
  return { ok: true, em: Date.now() };
}

export async function ignorarMovimento(movimentoId: string, ignorado: boolean): Promise<AcaoState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("extrato_movimentos").update({ ignorado }).eq("id", movimentoId);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return { ok: true, em: Date.now() };
}
