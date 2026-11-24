"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import { BLACK_LS, BLACK_ULTIMO_DIA, CATEGORIA_BLACK } from "@/lib/black-ls";
import type { Servico } from "@/lib/configuracoes";
import { desativarBlackLS, subirBlackLS } from "./actions";

/** Black LS (28–30/11): sobe os 7 serviços com um toque e, depois do dia 30, tira da agenda. */
export function BlackLSCard({ servicos, hoje, erro }: { servicos: Servico[]; hoje: string; erro?: string | null }) {
  const [pendente, iniciar] = useTransition();
  const ativos = servicos.filter((s) => s.categoria === CATEGORIA_BLACK && s.ativo);
  const acabou = hoje > BLACK_ULTIMO_DIA;
  if (acabou && ativos.length === 0) return null;

  function rodar(acao: () => Promise<{ ok?: boolean; erro?: string }>, msg: string) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.success(msg);
      else toast.error(r.erro ?? "Não deu certo. Tente de novo.");
    });
  }

  return (
    <section className="bg-sidebar text-sidebar-foreground rounded-xl p-4">
      <p className="text-gold flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4" /> Black LS · 28, 29 e 30/11
      </p>
      {acabou ? (
        <>
          <p className="mt-1 text-sm">A Black acabou. Tire os {ativos.length} serviços da agenda (o histórico continua).</p>
          <Button className="mt-3" variant="secondary" disabled={pendente} onClick={() => rodar(desativarBlackLS, "Serviços da Black tirados da agenda")}>
            {pendente && <Loader2 className="animate-spin" />} Tirar a Black da agenda
          </Button>
        </>
      ) : (
        <>
          <ul className="mt-2 space-y-0.5 text-sm">
            {BLACK_LS.map((b) => (
              <li key={b.nome} className="flex justify-between gap-3">
                <span className="truncate">{b.nome.replace("Black LS · ", "")}</span>
                <span className="text-white tabular-nums">{formatMoeda(b.preco)}</span>
              </li>
            ))}
          </ul>
          {ativos.length >= BLACK_LS.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-emerald-300">✓ Os {BLACK_LS.length} serviços já estão na agenda, no grupo &ldquo;Black LS&rdquo; (o primeiro da lista).</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/agenda?novo=1">Agendar um serviço da Black</Link>
              </Button>
            </div>
          ) : (
            <>
            {erro && (
              <p className="mt-3 rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-200">
                Não consegui colocar sozinho ({erro}). Toque no botão abaixo para tentar de novo.
              </p>
            )}
            <Button className="mt-3" variant="secondary" disabled={pendente} onClick={() => rodar(subirBlackLS, "Serviços da Black LS na agenda!")}>
              {pendente && <Loader2 className="animate-spin" />} Colocar os {BLACK_LS.length} serviços na agenda
            </Button>
            </>
          )}
          <p className="text-sidebar-foreground/70 mt-2 text-xs">
            Duração = soma dos serviços. Pagamento: Pix, débito ou crédito; a partir de R$ 150,00 em até 3x.
          </p>
        </>
      )}
    </section>
  );
}
