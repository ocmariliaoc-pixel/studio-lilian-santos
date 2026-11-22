"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMoeda } from "@/lib/format";
import type { Barra, ItemRanking, OrigemLeads } from "@/lib/resultados";
import { cn } from "@/lib/utils";

/*
 * Gráficos da tela Resultados.
 * Cores: slots 1–3 da paleta categórica de referência (já validados no funil de clientes:
 * CVD ΔE 9,2; visão normal ΔE 24). Esperado/meta = referência em cinza neutro, nunca uma cor de série.
 * Rótulos com número visível em todas as barras (o verde-água fica abaixo de 3:1 no branco).
 */
const AZUL = "#2a78d6";
const LARANJA = "#eb6834";
const VERDE = "#1baf7a";
const CINZA = "#8f8a80";

// ---------------------------------------------------------------------------
// Atendimentos por mês (toque no mês → semanas daquele mês; toque na semana → agenda)
// ---------------------------------------------------------------------------
export function AtendimentosGrafico({ meses, semanas }: { meses: Barra[]; semanas: Record<string, Barra[]> }) {
  const [mes, setMes] = useState<string>(meses.at(-1)?.chave ?? "");
  const sem = semanas[mes] ?? [];
  const mesAtual = meses.find((m) => m.chave === mes);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Colunas
        titulo="Atendimentos por mês"
        subtitulo="Toque num mês para ver as semanas"
        barras={meses}
        selecionada={mes}
        onEscolher={(b) => setMes(b.chave)}
      />
      <Colunas
        titulo={`Semanas de ${mesAtual?.rotulo ?? ""}`}
        subtitulo="Toque numa semana para abrir a agenda"
        barras={sem}
        link={(b) => `/agenda?d=${b.de}&v=semana`}
      />
    </div>
  );
}

function Colunas({
  titulo,
  subtitulo,
  barras,
  selecionada,
  onEscolher,
  link,
}: {
  titulo: string;
  subtitulo: string;
  barras: Barra[];
  selecionada?: string;
  onEscolher?: (b: Barra) => void;
  link?: (b: Barra) => string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...barras.map((b) => Math.max(b.feito, b.esperado))) * 1.15;
  const feitos = barras.reduce((s, b) => s + b.feito, 0);
  const esperados = Math.round(barras.reduce((s, b) => s + b.esperado, 0));
  const h = hover ? barras.find((b) => b.chave === hover) : null;

  return (
    <figure className="bg-card rounded-xl border p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <span>
          <span className="block text-sm font-semibold">{titulo}</span>
          <span className="text-muted-foreground block text-xs">{subtitulo}</span>
        </span>
        <span className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: AZUL }} /> Feitos {feitos}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed" style={{ borderColor: CINZA }} /> Esperado {esperados}
          </span>
        </span>
      </figcaption>
      {barras.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Sem dados no período.</p>
      ) : (
        <div className="relative">
          <div className="flex h-44 items-end gap-1.5 border-b" role="list">
            {barras.map((b) => {
              const ativo = selecionada === b.chave;
              const conteudo = (
                <>
                  <span className="relative flex w-full flex-1 flex-col items-center justify-end">
                    {/* esperado: risco tracejado na altura da meta */}
                    {b.esperado > 0 && (
                      <span
                        className="absolute inset-x-0 border-t-2 border-dashed"
                        style={{ bottom: `${(b.esperado / max) * 100}%`, borderColor: CINZA }}
                      />
                    )}
                    <span className="text-foreground relative mb-0.5 text-xs font-semibold tabular-nums">{b.feito}</span>
                    <span
                      className="w-full max-w-10 rounded-t-[4px]"
                      style={{
                        height: `${(b.feito / max) * 100}%`,
                        minHeight: b.feito ? 2 : 0,
                        background: AZUL,
                        opacity: selecionada && !ativo ? 0.45 : 1,
                      }}
                    />
                  </span>
                </>
              );
              const props = {
                className: cn(
                  "flex h-full min-w-0 flex-1 flex-col items-center rounded-t-md pt-1 outline-none",
                  "hover:bg-secondary/60 focus-visible:ring-ring/50 focus-visible:ring-2",
                  ativo && "bg-secondary"
                ),
                onMouseEnter: () => setHover(b.chave),
                onMouseLeave: () => setHover(null),
                "aria-label": `${b.rotulo}: ${b.feito} atendimentos, esperado ${b.esperado}`,
              };
              return link ? (
                <Link key={b.chave} href={link(b)} {...props} role="listitem">
                  {conteudo}
                </Link>
              ) : (
                <button key={b.chave} type="button" onClick={() => onEscolher?.(b)} {...props} role="listitem">
                  {conteudo}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1.5">
            {barras.map((b) => (
              <span key={b.chave} className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[10px] sm:text-[11px]">
                {b.rotulo}
              </span>
            ))}
          </div>
          {h && (
            <div className="bg-popover pointer-events-none absolute top-0 right-0 rounded-md border px-2.5 py-1.5 text-xs shadow-md">
              <p className="font-medium">{h.rotulo}</p>
              <p>Feitos: {h.feito}</p>
              <p className="text-muted-foreground">
                Esperado: {String(h.esperado).replace(".", ",")}
                {h.esperado > 0 ? ` (${Math.round((h.feito / h.esperado) * 100)}%)` : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Rankings: barras horizontais ordenadas (uma série → sem legenda, o título nomeia)
// ---------------------------------------------------------------------------
export function Ranking({
  titulo,
  itens,
  unidade,
  vazio,
  href,
}: {
  titulo: string;
  itens: ItemRanking[];
  unidade: [string, string];
  vazio: string;
  href?: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <section className="bg-card rounded-xl border p-4">
      <h3 className="mb-3 flex items-center justify-between font-sans text-sm font-semibold">
        {titulo}
        {href && (
          <Link href={href} className="text-muted-foreground flex items-center text-xs font-normal underline">
            ver <ChevronRight className="size-3.5" />
          </Link>
        )}
      </h3>
      {itens.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">{vazio}</p>
      ) : (
        <ol className="space-y-2.5">
          {itens.map((i, k) => (
            <li key={i.nome} title={`${i.nome}: ${i.qtd} ${i.qtd === 1 ? unidade[0] : unidade[1]}${i.valor ? ` · ${formatMoeda(i.valor)}` : ""}`}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground mr-1.5 tabular-nums">{k + 1}.</span>
                  {i.nome}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {i.qtd}
                  {i.valor > 0 && <span className="text-muted-foreground ml-1.5 text-xs font-normal">{formatMoeda(i.valor)}</span>}
                </span>
              </div>
              <div className="bg-secondary mt-1 h-2 overflow-hidden rounded-full">
                <div className="h-full rounded-full" style={{ width: `${(i.qtd / max) * 100}%`, background: AZUL }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Leads: ganhos / possíveis (em aberto) / perdidos, no total e por origem
// ---------------------------------------------------------------------------
const PARTES = [
  { chave: "ganhos", rotulo: "Ganhos", cor: VERDE },
  { chave: "abertos", rotulo: "Possíveis", cor: AZUL },
  { chave: "perdidos", rotulo: "Perdidos", cor: LARANJA },
] as const;

export function LeadsGrafico({ origens }: { origens: OrigemLeads[] }) {
  const tot = { ganhos: 0, abertos: 0, perdidos: 0 };
  for (const o of origens) {
    tot.ganhos += o.ganhos;
    tot.abertos += o.abertos;
    tot.perdidos += o.perdidos;
  }
  const total = tot.ganhos + tot.abertos + tot.perdidos;
  const decididos = tot.ganhos + tot.perdidos;
  const max = Math.max(1, ...origens.map((o) => o.ganhos + o.abertos + o.perdidos));

  return (
    <section className="bg-card space-y-4 rounded-xl border p-4">
      <div className="grid grid-cols-3 gap-2">
        {PARTES.map((p) => (
          <Link
            key={p.chave}
            href={`/clientes?f=${p.chave === "ganhos" ? "ganho" : p.chave === "abertos" ? "lead" : "perdido"}`}
            className="hover:bg-secondary/50 rounded-lg border p-3"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className="size-2.5 rounded-sm" style={{ background: p.cor }} />
              {p.rotulo}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{tot[p.chave]}</span>
          </Link>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Possíveis = leads ainda em aberto · {total} contatos cadastrados no período
        {decididos ? ` · ${Math.round((tot.ganhos / decididos) * 100)}% viraram clientes (ganhos ÷ decididos)` : ""}
      </p>

      <div>
        <h3 className="mb-2 font-sans text-sm font-semibold">Por onde vieram</h3>
        {origens.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Nenhum contato no período.</p>
        ) : (
          <ul className="space-y-3">
            {origens.map((o) => {
              const n = o.ganhos + o.abertos + o.perdidos;
              return (
                <li key={o.origem}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{o.origem}</span>
                    <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
                      <b className="text-foreground">{n}</b> · {o.ganhos} gan. · {o.abertos} poss. · {o.perdidos} perd.
                    </span>
                  </div>
                  <div
                    className="mt-1 flex h-3 gap-0.5"
                    style={{ width: `${Math.max((n / max) * 100, 4)}%` }}
                    role="img"
                    aria-label={`${o.origem}: ${o.ganhos} ganhos, ${o.abertos} possíveis, ${o.perdidos} perdidos`}
                  >
                    {PARTES.map((p) =>
                      o[p.chave] > 0 ? (
                        <span
                          key={p.chave}
                          className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                          style={{ flexGrow: o[p.chave], background: p.cor }}
                          title={`${p.rotulo}: ${o[p.chave]}`}
                        />
                      ) : null
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
