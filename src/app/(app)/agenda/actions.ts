"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolverCliente } from "@/lib/clientes-server";
import { normalizarTelefone } from "@/lib/clientes";
import { DIAS_SEMANA, FORMAS_PAGAMENTO, hhmm, parseNumeroBR, type FormaPagamento } from "@/lib/configuracoes";
import { isDataISO } from "@/lib/financeiro";
import {
  dataLocal,
  descricaoItens,
  diaDaSemana,
  hhmmDeMinutos,
  minutosDeHHMM,
  paraISO,
  DIA_DE_CURSO,
  OFFSET,
  OCUPA_AGENDA,
  somarDias,
  minutosLocal,
  type FaixaOcupada,
  type OcupacaoDia,
  type ItemAgendamento,
  type StatusAgendamento,
} from "@/lib/agenda";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

export type AgendaState = AcaoState & {
  foraDoHorario?: string;
  /** depois de salvar: para a mensagem de WhatsApp "seu agendamento foi marcado" */
  marcado?: { nome: string; whatsapp: string | null; inicio: string; servicos: string; remarcado: boolean };
};

/** O que já está ocupado num dia (para a tela oferecer só horários livres). */
export async function ocupacaoDoDia(data: string, ignorarId: string | null): Promise<OcupacaoDia | null> {
  await getPerfil();
  if (!isDataISO(data)) return null;
  const supabase = await createClient();
  const ini = `${data}T00:00:00${OFFSET}`;
  const fim = `${somarDias(data, 1)}T00:00:00${OFFSET}`;
  // minutos do dia, cortando o que começa antes ou termina depois dele
  const noDia = (iso: string, ehFim: boolean) =>
    dataLocal(iso) < data ? 0 : dataLocal(iso) > data || (ehFim && minutosLocal(iso) === 0) ? 24 * 60 : minutosLocal(iso);

  let consulta = supabase
    .from("agendamentos")
    .select("id, inicio, fim_ocupado, cliente:clientes(nome)")
    .in("status", OCUPA_AGENDA)
    .lt("inicio", fim)
    .gt("fim_ocupado", ini);
  if (ignorarId) consulta = consulta.neq("id", ignorarId);
  const [ags, h, bl] = await Promise.all([
    consulta,
    supabase.from("horarios_funcionamento").select("aberto, abre, fecha, pausa_inicio, pausa_fim").eq("dia_semana", diaDaSemana(data)).limit(1).maybeSingle(),
    supabase.from("bloqueios_agenda").select("inicio, fim, motivo").lt("inicio", fim).gt("fim", ini),
  ]);
  if (ags.error) return null;

  const fechados: FaixaOcupada[] = (bl.data ?? []).map((b) => ({ de: noDia(b.inicio, false), ate: noDia(b.fim, true), quem: b.motivo }));
  if (h.data?.aberto && h.data.pausa_inicio && h.data.pausa_fim)
    fechados.push({ de: minutosDeHHMM(h.data.pausa_inicio), ate: minutosDeHHMM(h.data.pausa_fim), quem: "Pausa" });
  return {
    abre: h.data?.aberto ? minutosDeHHMM(h.data.abre) : null,
    fecha: h.data?.aberto ? minutosDeHHMM(h.data.fecha) : null,
    ocupados: (ags.data ?? []).map((a) => ({
      de: noDia(a.inicio, false),
      ate: noDia(a.fim_ocupado, true),
      quem: (a.cliente as unknown as { nome: string } | null)?.nome ?? "outra cliente",
    })),
    fechados,
  };
}

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
      else if (ini < minutosDeHHMM(h.abre))
        aviso = `Começa antes da abertura de ${nomeDia} (${hhmm(h.abre)} às ${hhmm(h.fecha)}).`;
      else if (fim > minutosDeHHMM(h.fecha))
        aviso = `Termina às ${hhmmDeMinutos(fim)}, depois do fechamento de ${nomeDia} (${hhmm(h.fecha)}).`;
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

  // Mesma cliente pelo nome; nome parecido com outro cadastro pede confirmação (não duplica)
  const whatsapp = normalizarTelefone(String(formData.get("cliente_whatsapp") ?? "")) || null;
  const rc = await resolverCliente(supabase, clienteNome, {
    confirmarNova: formData.get("confirmar_nova") === "1",
    whatsapp,
    exigirWhatsapp: true,
  });
  if (!rc.ok) return { ...falha(rc.erro), parecidas: rc.parecidas };
  const clienteId = rc.id;
  // Origem do agendamento também vira a origem da cliente, se ainda não tinha
  if (marcadoPor) await supabase.from("clientes").update({ origem: marcadoPor }).eq("id", clienteId).is("origem", null);

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
      return falha("O banco ainda trava horários sobrepostos: rode a migração 0016 no Supabase.");
    return falha(mensagemErroBanco(error));
  }

  // Curso de vários dias: marca os dias seguintes da turma com a data, o início e o término que a pessoa
  // conferiu na tela (sem valor — a venda entra no 1º dia)
  const curso = itens.find((i) => (i.curso_dias ?? 1) > 1);
  if (!id && curso) {
    let dias: { data: string; inicio: string; fim: string }[] = [];
    try {
      dias = JSON.parse(String(formData.get("dias_curso") ?? "[]"));
    } catch {}
    const total = dias.length + 1;
    let k = 1;
    for (const d of dias) {
      k++;
      const ok = isDataISO(d.data) && /^\d{2}:\d{2}$/.test(d.inicio) && /^\d{2}:\d{2}$/.test(d.fim);
      const dur = ok ? minutosDeHHMM(d.fim) - minutosDeHHMM(d.inicio) : 0;
      if (!ok || dur <= 0) continue;
      await supabase.rpc("salvar_agendamento", {
        p_id: null,
        p_cliente_id: clienteId,
        p_inicio: paraISO(d.data, d.inicio),
        p_itens: [{ servico_id: null, nome: `${curso.nome} — dia ${k} de ${total}`, duracao_min: dur, valor: 0 }],
        p_valor_total: 0,
        p_marcado_por: marcadoPor,
        p_observacoes: "Continuação da turma (marcado junto com o 1º dia)",
      });
    }
  }

  revalidar();
  const { data: cli } = await supabase.from("clientes").select("nome, whatsapp").eq("id", clienteId).maybeSingle();
  const novoInicio = paraISO(data, hora);
  const anterior = String(formData.get("inicio_anterior") ?? "");
  return {
    ...sucesso(),
    marcado: {
      nome: cli?.nome ?? clienteNome,
      // número do cadastro; se ainda não estiver lá, o que foi digitado agora
      whatsapp: cli?.whatsapp ?? whatsapp ?? null,
      inicio: novoInicio,
      servicos: descricaoItens(itens),
      remarcado: !!id && !!anterior && new Date(anterior).getTime() !== new Date(novoInicio).getTime(),
    },
  };
}

export async function mudarStatus(id: string, status: StatusAgendamento): Promise<AcaoState> {
  await getPerfil();
  if (status === "realizado") return falha("Use \"Concluído\" para registrar o pagamento.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({ status, ...(status === "confirmado" ? { confirmado_em: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) {
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
  const itensAg = ((ag.itens as { nome: string; ordem: number }[]) ?? []).sort((a, b) => a.ordem - b.ordem);
  // Dias seguintes de uma turma de curso: só marca como concluído (a venda já entrou no 1º dia)
  const soContinuacao = itensAg.length > 0 && itensAg.every((i) => DIA_DE_CURSO.test(i.nome));
  if (!ja?.length && !soContinuacao) {
    const itens = itensAg;
    const cliente = ag.cliente as unknown as { nome: string } | null;
    const { error: e2 } = await supabase.from("lancamentos").insert({
      tipo: "entrada",
      data: dataLocal(ag.inicio),
      descricao: descricaoItens(itens) || "Atendimento",
      cliente_nome: cliente?.nome ?? null,
      cliente_id: ag.cliente_id,
      categoria: valorCobrado === 0 ? "Brinde" : itens.some((i) => /^curso/i.test(i.nome)) ? "Curso" : "Serviço",
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
