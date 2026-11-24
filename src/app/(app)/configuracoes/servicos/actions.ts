"use server";

import { revalidatePath } from "next/cache";
import { getPerfil, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_MODELO, ehModelo, nomeModelo, parseNumeroBR } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";
import { BLACK_LS, CATEGORIA_BLACK, DURACAO_PADRAO } from "@/lib/black-ls";

export async function salvarServico(_: AcaoState, formData: FormData): Promise<AcaoState> {
  const id = String(formData.get("id") ?? "") || null;
  // Cadastrar serviço novo: toda a equipe (a Lilian também). Editar um existente: só a admin.
  if (id) await requireAdmin();
  else if (!(await getPerfil()).ativo) return falha("Conta desativada.");

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
  revalidatePath("/produtos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return sucesso();
}

/**
 * Serviço de modelo (geral, sem detalhar): a admin escolhe os grupos ("Micro labial", "Lash"…) ou digita outro.
 * Cada um vira "Modelo — <nome>" (categoria Modelo, valor a combinar = R$ 0 na tabela). Duração e retorno vêm
 * do maior serviço pago do grupo (sem grupo: 60 min). Marcados: cria ou reativa; desmarcados: desativa.
 */
export async function salvarModelos(escolhas: { nome: string; categoria: string | null }[]): Promise<AcaoState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("servicos").select("id, nome, categoria, duracao_min, preco, retorno_dias, ativo");
  if (error) return falha(mensagemErroBanco(error));
  const todos = (data ?? []).map((s) => ({ ...s, preco: Number(s.preco) }));
  const modelos = todos.filter((s) => ehModelo(s));
  const limpas = escolhas
    .map((e) => ({ nome: e.nome.trim().replace(/\s+/g, " "), categoria: e.categoria }))
    .filter((e) => e.nome);
  const nomes = new Set(limpas.map((e) => nomeModelo(e.nome).toLowerCase()));

  for (const e of limpas) {
    const nome = nomeModelo(e.nome);
    const doGrupo = todos.filter((s) => e.categoria && s.categoria === e.categoria && s.ativo && s.preco > 0 && !ehModelo(s));
    const duracao = doGrupo.length ? Math.max(...doGrupo.map((s) => s.duracao_min)) : 60;
    const retornos = doGrupo.map((s) => s.retorno_dias).filter((r): r is number => r != null);
    const retorno = retornos.length ? Math.max(...retornos) : null;
    const existe = modelos.find((m) => m.nome.toLowerCase() === nome.toLowerCase());
    const r = existe
      ? await supabase.from("servicos").update({ ativo: true, categoria: CATEGORIA_MODELO }).eq("id", existe.id)
      : await supabase.from("servicos").insert({
          nome,
          categoria: CATEGORIA_MODELO,
          duracao_min: duracao,
          preco: 0,
          retorno_dias: retorno,
          ativo: true,
        });
    if (r.error) return falha(mensagemErroBanco(r.error));
  }
  const desligar = modelos.filter((m) => m.ativo && !nomes.has(m.nome.toLowerCase())).map((m) => m.id);
  if (desligar.length) {
    const r = await supabase.from("servicos").update({ ativo: false }).in("id", desligar);
    if (r.error) return falha(mensagemErroBanco(r.error));
  }

  revalidatePath("/configuracoes/servicos");
  revalidatePath("/produtos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return sucesso();
}

/** Black LS: cria (ou atualiza) os 7 serviços da promoção; duração = soma dos serviços existentes. */
export async function subirBlackLS(): Promise<AcaoState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("servicos").select("id, nome, categoria, duracao_min, preco");
  if (error) return falha(mensagemErroBanco(error));
  const todos = (data ?? []).map((s) => ({ ...s, preco: Number(s.preco) }));
  const duracao = (parte: string) => {
    if (parte === "micro labial") {
      const micros = todos.filter((s) => s.categoria === "Micropigmentação · Lábios" && s.preco > 0);
      return micros.length ? Math.max(...micros.map((s) => s.duracao_min)) : DURACAO_PADRAO[parte];
    }
    return todos.find((s) => s.nome.toLowerCase() === parte)?.duracao_min ?? DURACAO_PADRAO[parte] ?? 60;
  };
  for (const b of BLACK_LS) {
    const dados = {
      nome: b.nome,
      categoria: CATEGORIA_BLACK,
      duracao_min: Math.min(600, b.partes.reduce((t, p) => t + duracao(p), 0)),
      preco: b.preco,
      retorno_dias: b.retorno,
      ativo: true,
    };
    const existe = todos.find((s) => s.nome.toLowerCase() === b.nome.toLowerCase());
    const r = existe
      ? await supabase.from("servicos").update(dados).eq("id", existe.id)
      : await supabase.from("servicos").insert(dados);
    if (r.error) return falha(mensagemErroBanco(r.error));
  }
  revalidatePath("/configuracoes/servicos");
  revalidatePath("/produtos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return sucesso();
}

/** Depois da Black: tira os serviços da agenda (o histórico continua). */
export async function desativarBlackLS(): Promise<AcaoState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("servicos").update({ ativo: false }).eq("categoria", CATEGORIA_BLACK);
  if (error) return falha(mensagemErroBanco(error));
  revalidatePath("/configuracoes/servicos");
  revalidatePath("/produtos");
  revalidatePath("/agenda");
  revalidatePath("/");
  return sucesso();
}
