"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { HorarioDia } from "@/lib/configuracoes";
import { falha, mensagemErroBanco, sucesso, type AcaoState } from "@/lib/acoes";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function validarDia(d: HorarioDia): string | null {
  if (!d.aberto) return null;
  if (!HORA.test(d.abre) || !HORA.test(d.fecha)) return "horário inválido";
  if (d.fecha <= d.abre) return "o fechamento precisa ser depois da abertura";
  const temPausa = Boolean(d.pausa_inicio || d.pausa_fim);
  if (temPausa) {
    if (!d.pausa_inicio || !d.pausa_fim) return "preencha início e fim da pausa";
    if (!HORA.test(d.pausa_inicio) || !HORA.test(d.pausa_fim)) return "pausa inválida";
    if (d.pausa_fim <= d.pausa_inicio) return "o fim da pausa precisa ser depois do início";
    if (d.pausa_inicio < d.abre || d.pausa_fim > d.fecha)
      return "a pausa precisa estar dentro do horário de atendimento";
  }
  return null;
}

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export async function salvarHorarios(_: AcaoState, formData: FormData): Promise<AcaoState> {
  await requireAdmin();

  let dias: HorarioDia[];
  try {
    dias = JSON.parse(String(formData.get("dias") ?? "[]"));
  } catch {
    return falha("Dados inválidos. Recarregue a página.");
  }
  if (!Array.isArray(dias) || dias.length !== 7) return falha("Dados inválidos. Recarregue a página.");

  for (const d of dias) {
    const erro = validarDia(d);
    if (erro) return falha(`${NOMES[d.dia_semana]}: ${erro}.`);
  }

  const intervalo = Number(formData.get("intervalo_min"));
  const diasInativa = Number(formData.get("dias_cliente_inativa"));
  if (!Number.isInteger(intervalo) || intervalo < 0 || intervalo > 120)
    return falha("O intervalo entre atendimentos deve ficar entre 0 e 120 minutos.");
  if (!Number.isInteger(diasInativa) || diasInativa < 7 || diasInativa > 730)
    return falha("Os dias para cliente inativa devem ficar entre 7 e 730.");

  const supabase = await createClient();

  for (const d of dias) {
    const temPausa = d.aberto && Boolean(d.pausa_inicio && d.pausa_fim);
    const { error } = await supabase
      .from("horarios_funcionamento")
      .update({
        aberto: d.aberto,
        abre: d.abre,
        fecha: d.fecha,
        pausa_inicio: temPausa ? d.pausa_inicio : null,
        pausa_fim: temPausa ? d.pausa_fim : null,
      })
      .eq("dia_semana", d.dia_semana);
    if (error) return falha(mensagemErroBanco(error));
  }

  const { error } = await supabase
    .from("configuracoes")
    .update({ intervalo_min: intervalo, dias_cliente_inativa: diasInativa })
    .eq("id", 1);
  if (error) return falha(mensagemErroBanco(error));

  revalidatePath("/configuracoes/horarios");
  return sucesso();
}
