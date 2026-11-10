"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes";
import { dataExtensoISO, nomeForma, type Lancamento } from "@/lib/financeiro";
import { cn } from "@/lib/utils";
import { LancamentoDialog, type DadosFormulario } from "./lancamento-form";

/** Botão "Novo lançamento" + lista do período (agrupada por dia) + painel de edição. */
export function Caixa({
  lancamentos,
  dados,
  meuId,
  admin,
  mostrarLista,
  semBotao = false,
}: {
  lancamentos: Lancamento[];
  dados: DadosFormulario;
  meuId: string;
  admin: boolean;
  mostrarLista: boolean;
  /** true no Financeiro: o lançamento novo fica no Início */
  semBotao?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<Lancamento | null>(null);

  function abrir(l: Lancamento | null) {
    setAtual(l);
    setAberto(true);
  }

  const dias = new Map<string, Lancamento[]>();
  for (const l of lancamentos) dias.set(l.data, [...(dias.get(l.data) ?? []), l]);
  const grupos = [...dias.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <>
      {/* Botão flutuante (no celular, acima da barra de navegação) */}
      {!semBotao && <Button
        size="lg"
        onClick={() => abrir(null)}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 h-14 rounded-full px-5 shadow-lg md:right-10 md:bottom-8"
      >
        <Plus className="size-5" />
        Novo lançamento
      </Button>}

      {mostrarLista && (
        <div className="space-y-6">
          {grupos.length === 0 && (
            <p className="text-muted-foreground bg-card rounded-xl border border-dashed p-8 text-center text-sm">
              Nenhum lançamento neste período.
            </p>
          )}
          {grupos.map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="text-muted-foreground mb-2 font-sans text-xs font-semibold tracking-widest uppercase">
                {dataExtensoISO(dia, false)}
              </h2>
              <ul className="bg-card divide-y overflow-hidden rounded-xl border">
                {itens.map((l) => {
                  const brinde = l.tipo === "entrada" && l.valor === 0;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => abrir(l)}
                        className={cn(
                          "hover:bg-secondary/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          l.cancelado && "opacity-50"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-medium", l.cancelado && "line-through")}>
                            {l.descricao}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {[
                              l.cliente_nome,
                              brinde
                                ? "Brinde"
                                : l.tipo === "entrada"
                                  ? nomeForma(l.forma_pagamento, l.parcelas, FORMAS_PAGAMENTO)
                                  : l.categoria,
                              l.cancelado ? "cancelado" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="text-right whitespace-nowrap">
                          <span
                            className={cn(
                              "block font-semibold",
                              brinde
                                ? "text-muted-foreground"
                                : l.tipo === "entrada"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                            )}
                          >
                            {brinde ? "Brinde" : `${l.tipo === "entrada" ? "+" : "−"} ${formatMoeda(l.valor)}`}
                          </span>
                          {l.tipo === "entrada" && l.taxa_percentual > 0 && (
                            <span className="text-muted-foreground block text-xs">
                              líquido {formatMoeda(l.valor_liquido)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <LancamentoDialog
        open={aberto}
        onOpenChange={setAberto}
        lancamento={atual}
        podeEditar={!atual || admin || atual.criado_por === meuId}
        dados={dados}
      />
    </>
  );
}
