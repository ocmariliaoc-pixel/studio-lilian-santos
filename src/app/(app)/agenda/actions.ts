"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acharOuCriarCliente } from "@/lib/clientes-server";
import { DIAS_SEMANA, FORMAS_PAGAMENTO, hhmm, parseNumeroBR, type FormaPagamento } from "@/lib/configuracoes";
import { isDataISO } from "@/lib/financeiro";
import {
  dataLocal,
  descricaoItens,
  diaDaSemana,
  minutosDeHHMM,
  paraISO,
  type ItemAgendamento,
  type StatusAgendamento,
} from "@/lib/agenda";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export type AgendaState = AcaoState & { foraDoHorario?: string };

function revalidar() {
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function salvarAgendamento(_: AgendaState, formData: FormData): Promise<AgendaState> {
  await getPerfil();

  const id = String(formData.get("id") ?? "") || null;
  const clienteNome = String(formData.get("cliente_nome") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const valorTotal = parseNumeroBR(String(formData.get("valor_total") ?? ""));
  const marcadoPor = String(formData.get("marcado_por") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "");
  const ignorarHorario = formData.get("ignorar_horario") === "1";

  let itens: ItemAgendamento[];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return falha("Dados inválidos. Recarregue a página.");
  }

  if (!clienteNome) return falha("Informe a cliente.");
  if (!isDataISO(data)) return falha("Escolha a data.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return falha("Escolha o horário.");
  if (!Array.isArray(itens) || itens.length === 0) return falha("Escolha pelo menos um serviço.");
  if (valorTotal == null || valorTotal < 0) return falha("Valor inválido.");

  const supabase = await createClient();
  const duracao = itens.reduce((s, i) => s + Number(i.duracao_min || 0), 0);

  // Horário de funcionamento: avisa, mas deixa marcar se confirmarem.
  if (!ignorarHorario) {
    const dow = diaDaSemana(data);
    const { data: h } = await supabase
      .from("horarios_funcionamento")
      .select("aberto, abre, fecha, pausa_inicio, pausa_fim")
      .eq("dia_semana", dow)
      .maybeSingle();
    if (h) {
      const ini = minutosDeHHMM(hora);
      const fim = ini + duracao;
      const nomeDia = DIAS_SEMANA[dow].toLowerCase();
      let aviso: string | null = null;
      if (!h.aberto) aviso = `O studio não atende ${nomeDia}.`;
      else if (ini < minutosDeHHMM(h.abre) || fim > minutosDeHHMM(h.fecha))
        aviso = `Fora do horário de ${nomeDia} (${hhmm(h.abre)} às ${hhmm(h.fecha)}).`;
      else if (
        h.pausa_inicio &&
        h.pausa_fim &&
        ini < minutosDeHHMM(h.pausa_fim) &&
        fim > minutosDeHHMM(h.pausa_inicio)
      )
        aviso = `Passa pela pausa (${hhmm(h.pausa_inicio)} às ${hhmm(h.pausa_fim)}).`;
      if (aviso) return { ...falha(aviso), foraDoHorario: aviso };
    }
    // Horário fechado pelo botão "Fechar horário"
    const inicioISO = paraISO(data, hora);
    const fimISO = new Date(new Date(inicioISO).getTime() + duracao * 60_000).toISOString();
    const { data: bloqueio } = await supabase
      .from("bloqueios_agenda")
      .select("motivo")
      .lt("inicio", fimISO)
      .gt("fim", inicioISO)
      .limit(1)
      .maybeSingle();
    if (bloqueio) {
      const aviso = `A agenda está fechada nesse horário (${bloqueio.motivo}).`;
      return { ...falha(aviso), foraDoHorario: aviso };
    }
  }

  const clienteId = await acharOuCriarCliente(supabase, clienteNome);
  if (!clienteId) return falha("Não foi possível cadastrar a cliente. Confira se a migração 0006 foi rodada.");

  const { error } = await supabase.rpc("salvar_agendamento", {
    p_id: id,
    p_cliente_id: clienteId,
    p_inicio: paraISO(data, hora),
    p_itens: itens,
    p_valor_total: Math.round(valorTotal * 100) / 100,
    p_marcado_por: marcadoPor,
    p_observacoes: observacoes,
  });

  if (error) {
    if (error.code === "23P01")
      return falha("Esse horário já está ocupado (contando o intervalo entre clientes). Escolha outro.");
    return falha(mensagemErroBanco(error));
  }

  revalidar();
  return sucesso();
}

export async function mudarStatus(id: string, status: StatusAgendamento): Promise<AcaoState> {
  await getPerfil();
  if (status === "realizado") return falha("Use \"Realizado\" para registrar o pagamento.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({ status, ...(status === "confirmado" ? { confirmado_em: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) {
    if (error.code === "23P01") return falha("Não dá para reabrir: o horário já foi ocupado por outra cliente.");
    return falha(mensagemErroBanco(error));
  }
  revalidar();
  return sucesso();
}

/** Marca como realizado e lança a entrada no caixa (uma vez só). */
export async function marcarRealizado(
  id: string,
  forma: FormaPagamento | null,
  parcelas: number,
  valorCobrado: number
): Promise<AcaoState> {
  const perfil = await getPerfil();
  if (valorCobrado < 0 || !Number.isFinite(valorCobrado)) return falha("Valor inválido.");
  if (valorCobrado > 0 && (!forma || !(forma in FORMAS_PAGAMENTO))) return falha("Escolha a forma de pagamento.");
  if (forma === "credito_parcelado" && (parcelas < 2 || parcelas > 12)) return falha("Escolha as parcelas.");

  const supabase = await createClient();
  const { data: ag, error } = await supabase
    .from("agendamentos")
    .select("id, cliente_id, inicio, cliente:clientes(nome), itens:agendamento_itens(nome, ordem)")
    .eq("id", id)
    .single();
  if (error || !ag) return falha("Agendamento não encontrado.");

  const { data: ja } = await supabase.from("lancamentos").select("id").eq("agendamento_id", id).limit(1);
  if (!ja?.length) {
    const itens = ((ag.itens as { nome: string; ordem: number }[]) ?? []).sort((a, b) => a.ordem - b.ordem);
    const cliente = ag.cliente as unknown as { nome: string } | null;
    const { error: e2 } = await supabase.from("lancamentos").insert({
      tipo: "entrada",
      data: dataLocal(ag.inicio),
      descricao: descricaoItens(itens) || "Atendimento",
      cliente_nome: cliente?.nome ?? null,
      cliente_id: ag.cliente_id,
      categoria: valorCobrado === 0 ? "Brinde" : "Serviço",
      valor: Math.round(valorCobrado * 100) / 100,
      forma_pagamento: valorCobrado === 0 ? null : forma,
      parcelas: forma === "credito_parcelado" ? parcelas : 1,
      agendamento_id: id,
      criado_por: perfil.id,
    });
    if (e2) return falha(mensagemErroBanco(e2));
  }

  const { error: e3 } = await supabase
    .from("agendamentos")
    .update({ status: "realizado", valor_total: Math.round(valorCobrado * 100) / 100 })
    .eq("id", id);
  if (e3) return falha(mensagemErroBanco(e3));

  revalidar();
  return sucesso();
}

// ---------------------------------------------------------------------------
// Fechar / reabrir horário (dia inteiro, manhã, tarde ou intervalo)
// ---------------------------------------------------------------------------
export async function fecharHorario(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await getPerfil();
  const data = String(formData.get("data") ?? "");
  const de = String(formData.get("de") ?? "");
  const ate = String(formData.get("ate") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || "Fechado";
  if (!isDataISO(data)) return falha("Escolha o dia.");
  if (!/^\d{2}:\d{2}$/.test(de) || !/^\d{2}:\d{2}$/.test(ate) || ate <= de) return falha("Confira o horário (de / até).");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bloqueios_agenda")
    .insert({ inicio: paraISO(data, de), fim: paraISO(data, ate), motivo });
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}

export async function reabrirHorario(id: string): Promise<AcaoState> {
  await getPerfil();
  const supabase = await createClient();
  const { error } = await supabase.from("bloqueios_agenda").delete().eq("id", id);
  if (error) return falha(mensagemErroBanco(error));
  revalidar();
  return sucesso();
}
