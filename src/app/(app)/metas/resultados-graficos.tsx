"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMoeda } from "@/lib/format";
import type { Barra, OrigemLeads } from "@/lib/resultados";
import { cn } from "@/lib/utils";

/*
 * Gráficos da tela Resultados — cores da marca (as mesmas do resto do sistema):
 *   grafite #2b2622 (realizado / série principal), dourado #ad8f47 (destaque, série 2),
 *   cinza #8f8a80 tracejado para referência (esperado/meta: nunca uma cor de série).
 * Leads: rampa de um só tom (dourado escuro → claro) porque as etapas são ordenadas
 * (ganho > possível > perdido). Validador: separação CVD ΔE 17,9 entre vizinhas; o tom claro
 * fica abaixo de 3:1 no branco → todas as partes levam número visível (regra de alívio).
 * Tudo clicável leva à tela onde o número nasce.
 */
const GRAFITE = "#2b2622";
const DOURADO = "#ad8f47";
const DOURADO_ESCURO = "#7f6630";
const AREIA = "#d8c9a3";
const CINZA = "#8f8a80";

const milBR = (v: number) =>
  v >= 1000 ? `${String(Math.round(v / 100) / 10).replace(".", ",")} mil` : String(Math.round(v));

// ---------------------------------------------------------------------------
// Quadro executivo (KPI) clicável
// ---------------------------------------------------------------------------
export function Quadro({
  titulo,
  valor,
  detalhe,
  href,
  destaque,
  negativo,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  href: string;
  destaque?: boolean;
  negativo?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-xl border p-4 transition-colors",
        destaque ? "bg-sidebar text-sidebar-foreground border-transparent" : "bg-card hover:border-gold/60"
      )}
    >
      <p className={cn("pr-5 text-xs font-medium", destaque ? "text-gold" : "text-muted-foreground")}>{titulo}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.7rem]",
          negativo && "text-destructive",
          destaque && !negativo && "text-white"
        )}
      >
        {valor}
      </p>
      {detalhe && <p className={cn("mt-0.5 text-xs", destaque ? "text-sidebar-foreground/70" : "text-muted-foreground")}>{detalhe}</p>}
      <ChevronRight
        className={cn(
          "absolute top-4 right-3 size-4 transition-transform group-hover:translate-x-0.5",
          destaque ? "text-gold" : "text-muted-foreground"
        )}
      />
    </Link>
  );
}

function Moldura({
  titulo,
  subtitulo,
  legenda,
  href,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  legenda?: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="bg-card rounded-xl border p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <span>
          <span className="block text-sm font-semibold">
            {href ? (
              <Link href={href} className="hover:text-gold-dark inline-flex items-center gap-0.5">
                {titulo} <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              titulo
            )}
          </span>
          {subtitulo && <span className="text-muted-foreground block text-xs">{subtitulo}</span>}
        </span>
        {legenda && <span className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">{legenda}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

const Chave = ({ cor, children, tracejado }: { cor: string; children: React.ReactNode; tracejado?: boolean }) => (
  <span className="flex items-center gap-1.5">
    {tracejado ? (
      <span className="w-3 border-t-2 border-dashed" style={{ borderColor: cor }} />
    ) : (
      <span className="size-2.5 rounded-sm" style={{ background: cor }} />
    )}
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Entradas × saídas por mês (mesma unidade R$ → um eixo só, barras lado a lado)
// ---------------------------------------------------------------------------
export function EntradasSaidas({ meses }: { meses: { chave: string; rotulo: string; entradas: number; saidas: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...meses.flatMap((m) => [m.entradas, m.saidas])) * 1.12;
  const h = meses.find((m) => m.chave === hover);
  return (
    <Moldura
      titulo="Entradas × saídas por mês"
      subtitulo="Toque num mês para abrir o caixa daquele mês"
      legenda={
        <>
          <Chave cor={GRAFITE}>Entradas</Chave>
          <Chave cor={DOURADO}>Saídas</Chave>
        </>
      }
    >
      <div className="relative">
        <div className="flex h-48 items-end gap-2 border-b">
          {meses.map((m) => (
            <Link
              key={m.chave}
              href={`/financeiro?p=mes&d=${m.chave}-01`}
              onMouseEnter={() => setHover(m.chave)}
              onMouseLeave={() => setHover(null)}
              className="hover:bg-secondary/70 flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-t-md px-0.5 pt-5"
              aria-label={`${m.rotulo}: entradas ${formatMoeda(m.entradas)}, saídas ${formatMoeda(m.saidas)}`}
            >
              {([
                [m.entradas, GRAFITE],
                [m.saidas, DOURADO],
              ] as const).map(([v, cor], k) => (
                <span key={k} className="flex h-full w-full max-w-8 flex-col items-center justify-end">
                  <span className="text-foreground mb-0.5 text-[10px] font-semibold whitespace-nowrap tabular-nums">{milBR(v)}</span>
                  <span
                    className="w-full rounded-t-[4px]"
                    style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0, background: cor }}
                  />
                </span>
              ))}
            </Link>
          ))}
        </div>
        <div className="mt-1 flex gap-2">
          {meses.map((m) => (
            <span key={m.chave} className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[11px]">
              {m.rotulo}
            </span>
          ))}
        </div>
        {h && (
          <div className="bg-popover pointer-events-none absolute top-0 right-0 rounded-md border px-2.5 py-1.5 text-xs shadow-md">
            <p className="font-medium">{h.rotulo}</p>
            <p>Entradas: {formatMoeda(h.entradas)}</p>
            <p>Saídas: {formatMoeda(h.saidas)}</p>
            <p className={cn("font-medium", h.entradas - h.saidas < 0 && "text-destructive")}>
              Saldo: {formatMoeda(h.entradas - h.saidas)}
            </p>
          </div>
        )}
      </div>
    </Moldura>
  );
}

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
    <Moldura
      titulo={titulo}
      subtitulo={subtitulo}
      legenda={
        <>
          <Chave cor={GRAFITE}>Feitos {feitos}</Chave>
          <Chave cor={CINZA} tracejado>
            Esperado {esperados}
          </Chave>
        </>
      }
    >
      {barras.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Sem dados no período.</p>
      ) : (
        <div className="relative">
          <div className="flex h-44 items-end gap-1.5 border-b" role="list">
            {barras.map((b) => {
              const ativo = selecionada === b.chave;
              const conteudo = (
                <span className="relative flex w-full flex-1 flex-col items-center justify-end">
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
                      background: ativo ? DOURADO : GRAFITE,
                    }}
                  />
                </span>
              );
              const props = {
                className: cn(
                  "flex h-full min-w-0 flex-1 flex-col items-center rounded-t-md pt-1 outline-none",
                  "hover:bg-secondary/70 focus-visible:ring-ring/50 focus-visible:ring-2",
                  ativo && "bg-accent/60"
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
    </Moldura>
  );
}

// ---------------------------------------------------------------------------
// Lista com barras horizontais (rankings, formas de pagamento, categorias…): cada linha é clicável
// ---------------------------------------------------------------------------
export type LinhaBarra = { nome: string; valor: number; texto: string; detalhe?: string; href?: string };

export function BarrasLista({
  titulo,
  subtitulo,
  linhas,
  vazio,
  href,
  cor = "grafite",
  numerar,
}: {
  titulo: string;
  subtitulo?: string;
  linhas: LinhaBarra[];
  vazio: string;
  href?: string;
  cor?: "grafite" | "dourado";
  numerar?: boolean;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.valor));
  const fundo = cor === "dourado" ? DOURADO : GRAFITE;
  return (
    <Moldura titulo={titulo} subtitulo={subtitulo} href={href}>
      {linhas.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">{vazio}</p>
      ) : (
        <ol className="-mx-2 space-y-0.5">
          {linhas.map((l, k) => {
            const corpo = (
              <>
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {numerar && <span className="text-muted-foreground mr-1.5 tabular-nums">{k + 1}.</span>}
                    {l.nome}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {l.texto}
                    {l.detalhe && <span className="text-muted-foreground ml-1.5 text-xs font-normal">{l.detalhe}</span>}
                  </span>
                </span>
                <span className="bg-secondary mt-1 block h-2 overflow-hidden rounded-full">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: l.valor > 0 ? `${Math.max((l.valor / max) * 100, 2)}%` : 0, background: fundo }}
                  />
                </span>
              </>
            );
            return (
              <li key={l.nome}>
                {l.href ? (
                  <Link href={l.href} className="hover:bg-secondary/70 block rounded-md px-2 py-1.5">
                    {corpo}
                  </Link>
                ) : (
                  <div className="px-2 py-1.5">{corpo}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Moldura>
  );
}

// ---------------------------------------------------------------------------
// Leads: ganhos / possíveis / perdidos, no total e por origem
// ---------------------------------------------------------------------------
const PARTES = [
  { chave: "ganhos", rotulo: "Ganhos", cor: DOURADO_ESCURO, filtro: "ganho" },
  { chave: "abertos", rotulo: "Possíveis", cor: DOURADO, filtro: "lead" },
  { chave: "perdidos", rotulo: "Perdidos", cor: AREIA, filtro: "perdido" },
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
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Moldura titulo="Funil de leads" subtitulo="Toque para ver as clientes" href="/clientes">
        <div className="grid grid-cols-3 gap-2">
          {PARTES.map((p) => (
            <Link key={p.chave} href={`/clientes?f=${p.filtro}`} className="hover:border-gold/60 rounded-lg border p-3">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="size-2.5 rounded-sm" style={{ background: p.cor }} />
                {p.rotulo}
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums">{tot[p.chave]}</span>
            </Link>
          ))}
        </div>
        {total > 0 && (
          <Link href="/clientes" className="mt-3 flex h-3 gap-0.5" aria-label="Ver clientes">
            {PARTES.map((p) =>
              tot[p.chave] > 0 ? (
                <span
                  key={p.chave}
                  className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                  style={{ flexGrow: tot[p.chave], background: p.cor }}
                />
              ) : null
            )}
          </Link>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          {decididos ? (
            <>
              <b className="text-foreground text-base">{Math.round((tot.ganhos / decididos) * 100)}%</b> de conversão
              (ganhos ÷ decididos) ·{" "}
            </>
          ) : null}
          {total} contatos cadastrados no período · possíveis = leads em aberto
        </p>
      </Moldura>

      <Moldura
        titulo="Por onde vieram"
        subtitulo="Origem das clientes cadastradas no período"
        legenda={PARTES.map((p) => (
          <Chave key={p.chave} cor={p.cor}>
            {p.rotulo}
          </Chave>
        ))}
      >
        {origens.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Nenhum contato no período.</p>
        ) : (
          <ul className="-mx-2 space-y-0.5">
            {origens.map((o) => {
              const n = o.ganhos + o.abertos + o.perdidos;
              return (
                <li key={o.origem}>
                  <Link href="/clientes" className="hover:bg-secondary/70 block rounded-md px-2 py-1.5">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{o.origem}</span>
                      <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
                        <b className="text-foreground">{n}</b> · {o.ganhos} gan. · {o.abertos} poss. · {o.perdidos} perd.
                      </span>
                    </span>
                    <span
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
                          />
                        ) : null
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Moldura>
    </div>
  );
}
