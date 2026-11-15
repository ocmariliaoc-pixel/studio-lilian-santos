"use client";

import { useState } from "react";
import { CalendarPlus, Receipt, ShoppingBag } from "lucide-react";
import { LancamentoDialog, type DadosFormulario } from "@/app/(app)/financeiro/lancamento-form";
import type { TipoLancamento } from "@/lib/financeiro";
import type { Servico } from "@/lib/configuracoes";
import type { CursoAgenda } from "@/lib/agenda";
import { AgendamentoDialog } from "@/app/(app)/agenda/agendamento-dialog";

/** Topo do Início: registrar venda, agendar atendimento e lançar despesa. */
export function AcoesRapidas({
  dados,
  agenda,
}: {
  dados: DadosFormulario;
  agenda: { hoje: string; intervalo: number; servicos: Servico[]; cursos: CursoAgenda[] };
}) {
  const [aberto, setAberto] = useState<TipoLancamento | null>(null);
  // O agendamento abre aqui mesmo (antes ia para a Agenda e carregava a página inteira)
  const [agendando, setAgendando] = useState(false);
  const botao =
    "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-sm font-semibold leading-tight shadow-xs transition-colors";
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button type="button" onClick={() => setAberto("entrada")} className={`${botao} bg-card hover:bg-secondary`}>
          <ShoppingBag className="text-gold-dark size-5" />
          Registrar nova venda
        </button>
        <button type="button" onClick={() => setAgendando(true)} className={`${botao} bg-primary text-primary-foreground border-primary hover:bg-primary/90`}>
          <CalendarPlus className="size-5 text-gold" />
          Agendar novo atendimento
        </button>
        <button type="button" onClick={() => setAberto("saida")} className={`${botao} bg-card hover:bg-secondary`}>
          <Receipt className="text-gold-dark size-5" />
          Lançar despesa
        </button>
      </div>
      <LancamentoDialog
        open={aberto !== null}
        onOpenChange={(o) => !o && setAberto(null)}
        lancamento={null}
        podeEditar
        dados={dados}
        tipoInicial={aberto ?? "entrada"}
      />
      <AgendamentoDialog
        open={agendando}
        onOpenChange={setAgendando}
        agendamento={null}
        novoEm={{ data: agenda.hoje, hora: "09:00" }}
        servicos={agenda.servicos}
        clientes={dados.clientes}
        taxas={dados.taxas}
        intervalo={agenda.intervalo}
        cursos={agenda.cursos}
      />
    </>
  );
}
