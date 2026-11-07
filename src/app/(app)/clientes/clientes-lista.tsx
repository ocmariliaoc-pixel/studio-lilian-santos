"use client";

import { useMemo, useState } from "react";
import { Crown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMoeda } from "@/lib/format";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes";
import { dataBR, nomeForma } from "@/lib/financeiro";
import { diasDesde, faixaGasto, type ClienteResumo } from "@/lib/clientes";
import { cn } from "@/lib/utils";

type Ordem = "visita" | "gasto";

function haQuanto(dias: number) {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

const COR_FAIXA: Record<string, string> = {
  $$$: "bg-emerald-600 text-white",
  $$: "bg-emerald-100 text-emerald-900",
  $: "bg-secondary text-secondary-foreground",
};

export function ClientesLista({ clientes, hoje }: { clientes: ClienteResumo[]; hoje: string }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("gasto");

  // Ranking de quem mais gastou (só quem pagou algo)
  const posicao = useMemo(() => {
    const pagantes = [...clientes].filter((c) => c.total_gasto > 0).sort((a, b) => b.total_gasto - a.total_gasto);
    return new Map(pagantes.map((c, i) => [c.id, i + 1]));
  }, [clientes]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return clientes
      .filter((c) => !termo || c.nome.toLocaleLowerCase("pt-BR").includes(termo) || c.whatsapp?.includes(termo))
      .sort((a, b) =>
        ordem === "gasto"
          ? b.total_gasto - a.total_gasto || a.nome.localeCompare(b.nome, "pt-BR")
          : (b.ultima_visita ?? "").localeCompare(a.ultima_visita ?? "") || a.nome.localeCompare(b.nome, "pt-BR")
      );
  }, [clientes, busca, ordem]);

  const maior = Math.max(...clientes.map((c) => c.total_gasto), 1);
  const total = clientes.reduce((s, c) => s + c.total_gasto, 0);
  const pagantes = clientes.filter((c) => c.total_gasto > 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Numero titulo="Clientes" valor={String(clientes.length)} />
        <Numero titulo="Pagaram" valor={String(pagantes)} />
        <Numero titulo="Total gasto" valor={formatMoeda(total)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="pl-9"
          />
        </div>
        <div className="bg-secondary/60 grid grid-cols-2 gap-1 rounded-xl p-1 sm:w-72">
          {(
            [
              ["gasto", "Quem mais gasta"],
              ["visita", "Última visita"],
            ] as const
          ).map(([v, rotulo]) => (
            <button
              key={v}
              type="button"
              onClick={() => setOrdem(v)}
              className={cn(
                "h-10 rounded-lg text-sm font-medium",
                ordem === v ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <Crown className="size-3.5 text-amber-500" /> top 3
        </span>
        <span><b>$$$</b> R$ 300 ou mais</span>
        <span><b>$$</b> R$ 100 a 299</span>
        <span><b>$</b> até R$ 99</span>
      </p>

      {lista.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border border-dashed p-8 text-center text-sm">
          {clientes.length === 0 ? "Nenhuma cliente cadastrada ainda." : "Nenhuma cliente encontrada."}
        </p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-xl border">
          {lista.map((c) => {
            const pos = posicao.get(c.id);
            const faixa = faixaGasto(c.total_gasto);
            return (
              <li key={c.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.nome}</span>
                      {pos && pos <= 3 && (
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                          <Crown className="size-3.5" />
                          {pos}º
                        </span>
                      )}
                      {faixa ? (
                        <span
                          title={faixa.rotulo}
                          className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", COR_FAIXA[faixa.simbolo])}
                        >
                          {faixa.simbolo}
                        </span>
                      ) : (
                        <span className="text-muted-foreground rounded border px-1.5 py-0.5 text-[11px]">
                          só brinde
                        </span>
                      )}
                    </p>
                    {c.servicos_ultima_visita && (
                      <p className="text-muted-foreground mt-0.5 truncate text-sm">{c.servicos_ultima_visita}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold whitespace-nowrap">{formatMoeda(c.total_gasto)}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.visitas} {c.visitas === 1 ? "visita" : "visitas"}
                    </p>
                  </div>
                </div>

                {/* barra relativa: quanto essa cliente gastou perto da que mais gastou */}
                <div className="bg-secondary mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(c.total_gasto / maior) * 100}%` }}
                  />
                </div>

                <dl className="text-muted-foreground mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="font-medium">Última visita</dt>
                    <dd className="text-foreground">
                      {c.ultima_visita
                        ? `${dataBR(c.ultima_visita)} · ${haQuanto(diasDesde(c.ultima_visita, hoje))}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Último pagamento</dt>
                    <dd className="text-foreground">
                      {c.ultimo_pagamento_valor && c.ultimo_pagamento_em
                        ? `${formatMoeda(c.ultimo_pagamento_valor)} · ${nomeForma(
                            c.ultimo_pagamento_forma,
                            c.ultimo_pagamento_parcelas ?? 1,
                            FORMAS_PAGAMENTO
                          )} · ${dataBR(c.ultimo_pagamento_em)}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Numero({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-card rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{titulo}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight">{valor}</p>
    </div>
  );
}
