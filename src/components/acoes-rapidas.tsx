"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Receipt, ShoppingBag } from "lucide-react";
import { LancamentoDialog, type DadosFormulario } from "@/app/(app)/financeiro/lancamento-form";
import type { TipoLancamento } from "@/lib/financeiro";

/** Topo do Início: registrar venda, agendar atendimento e lançar despesa. */
export function AcoesRapidas({ dados }: { dados: DadosFormulario }) {
  const [aberto, setAberto] = useState<TipoLancamento | null>(null);
  const botao =
    "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-sm font-semibold leading-tight shadow-xs transition-colors";
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button type="button" onClick={() => setAberto("entrada")} className={`${botao} bg-primary text-primary-foreground border-primary hover:bg-primary/90`}>
          <ShoppingBag className="size-5 text-gold" />
          Registrar nova venda
        </button>
        <Link href="/agenda?novo=1" className={`${botao} bg-card hover:bg-secondary`}>
          <CalendarPlus className="text-gold-dark size-5" />
          Agendar novo atendimento
        </Link>
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
    </>
  );
}
