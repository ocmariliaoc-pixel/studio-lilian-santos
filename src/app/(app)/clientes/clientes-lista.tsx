"use client";

import { useMemo, useState } from "react";
import { Crown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMoeda } from "@/lib/format";
import { FORMAS_PAGAMENTO } from "@/lib/configuracoes";
import { dataBR, nomeForma } from "@/lib/financeiro";
import { diasAteAniversario, diasDesde, faixaGasto, STATUS_CLIENTE, type ClienteResumo } from "@/lib/clientes";
import { formatData, formatHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContatoCampos } from "./contato-campos";
import { FunilGrafico } from "./funil-grafico";
import { AcompanhamentoItem, CupomItem } from "@/components/acompanhamento-itens";
import { cupomValido, pendenteAgora, type Acompanhamento, type Cupom } from "@/lib/acompanhamentos";
import { somarDias } from "@/lib/agenda";
import { StatusCampos } from "./status-campos";

type Ordem = "gasto" | "recente" | "sumida";
type Filtro = "todos" | "lead" | "ganho" | "perdido" | "aniversario" | "mensagens" | "desconto";

type Extras = { acomp: Map<string, Acompanhamento[]>; cupons: Map<string, Cupom[]> };

const FILTROS: { v: Filtro; rotulo: string; teste: (c: ClienteResumo, hoje: string, x: Extras) => boolean }[] = [
  {
    v: "mensagens",
    rotulo: "Mensagens a enviar",
    teste: (c, hoje, x) => (x.acomp.get(c.id) ?? []).some((a) => pendenteAgora(a, hoje)),
  },
  {
    v: "desconto",
    rotulo: "Com desconto",
    teste: (c, hoje, x) => (x.cupons.get(c.id) ?? []).some((cu) => cupomValido(cu, hoje)),
  },
  { v: "todos", rotulo: "Todas", teste: () => true },
  { v: "lead", rotulo: "Leads", teste: (c) => c.status === "lead" },
  { v: "ganho", rotulo: "Ganhos", teste: (c) => c.status === "ativa" || c.status === "inativa" },
  { v: "perdido", rotulo: "Perdidos", teste: (c) => c.status === "perdido" },
  {
    v: "aniversario",
    rotulo: "Aniversário no mês",
    teste: (c, hoje) => !!c.data_nascimento && c.data_nascimento.slice(5, 7) === hoje.slice(5, 7),
  },
];

const COR_STATUS: Record<ClienteResumo["status"], string> = {
  lead: "bg-sky-50 text-sky-900 border-sky-200",
  ativa: "bg-emerald-50 text-emerald-900 border-emerald-200",
  inativa: "bg-muted text-muted-foreground",
  perdido: "bg-orange-50 text-orange-900 border-orange-200",
};

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

const ORDENS: { v: Ordem; rotulo: string }[] = [
  { v: "gasto", rotulo: "Quem mais gasta" },
  // Pela data do ÚLTIMO atendimento (não pela data do cadastro)
  { v: "recente", rotulo: "Veio por último" },
  { v: "sumida", rotulo: "Sem vir há mais tempo" },
];

export function ClientesLista({
  clientes,
  hoje,
  acompanhamentos,
  cupons,
  filtroInicial,
}: {
  clientes: ClienteResumo[];
  hoje: string;
  acompanhamentos: Acompanhamento[];
  cupons: Cupom[];
  filtroInicial?: string;
}) {
  const extras = useMemo<Extras>(() => {
    const acomp = new Map<string, Acompanhamento[]>();
    for (const a of acompanhamentos) acomp.set(a.cliente_id, [...(acomp.get(a.cliente_id) ?? []), a]);
    const cup = new Map<string, Cupom[]>();
    for (const c of cupons) cup.set(c.cliente_id, [...(cup.get(c.cliente_id) ?? []), c]);
    return { acomp, cupons: cup };
  }, [acompanhamentos, cupons]);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("gasto");
  const [filtro, setFiltro] = useState<Filtro>(
    FILTROS.some((f) => f.v === filtroInicial) ? (filtroInicial as Filtro) : "todos"
  );

  // Ranking de quem mais gastou (só quem pagou algo)
  const posicao = useMemo(() => {
    const pagantes = [...clientes].filter((c) => c.total_gasto > 0).sort((a, b) => b.total_gasto - a.total_gasto);
    return new Map(pagantes.map((c, i) => [c.id, i + 1]));
  }, [clientes]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const teste = FILTROS.find((f) => f.v === filtro)!.teste;
    return clientes
      .filter((c) => teste(c, hoje, extras))
      .filter((c) => !termo || c.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          (termo.replace(/\D/g, "") !== "" && c.whatsapp?.includes(termo.replace(/\D/g, ""))) ||
          c.instagram?.includes(termo.replace(/^@/, "")))
      .sort((a, b) => {
        const nome = a.nome.localeCompare(b.nome, "pt-BR");
        if (ordem === "gasto") return b.total_gasto - a.total_gasto || nome;
        // Quem nunca foi atendida (lead) fica no fim das duas ordens
        if (!a.ultima_visita || !b.ultima_visita) return Number(!a.ultima_visita) - Number(!b.ultima_visita) || nome;
        if (ordem === "recente") return b.ultima_visita.localeCompare(a.ultima_visita) || nome;
        return a.ultima_visita.localeCompare(b.ultima_visita) || nome;
      });
  }, [clientes, busca, ordem, filtro, hoje, extras]);

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

      <FunilGrafico clientes={clientes} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => {
          const n = clientes.filter((c) => f.teste(c, hoje, extras)).length;
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setFiltro(f.v)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                filtro === f.v ? "border-primary bg-primary text-primary-foreground" : "bg-card"
              )}
            >
              {f.rotulo} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou @"
            className="pl-9"
          />
        </div>
        <div className="bg-secondary/60 grid grid-cols-3 gap-1 rounded-xl p-1 sm:w-[30rem]">
          {ORDENS.map(({ v, rotulo }) => (
            <button
              key={v}
              type="button"
              onClick={() => setOrdem(v)}
              className={cn(
                "h-10 rounded-lg px-1 text-xs leading-tight font-medium sm:text-sm",
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
                      <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", COR_STATUS[c.status])}>
                        {STATUS_CLIENTE[c.status]}
                      </span>
                      {c.data_nascimento && diasAteAniversario(c.data_nascimento, hoje) <= 7 && (
                        <span title="Aniversário chegando" aria-label="Aniversário chegando">🎂</span>
                      )}
                      {faixa ? (
                        <span
                          title={faixa.rotulo}
                          className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", COR_FAIXA[faixa.simbolo])}
                        >
                          {faixa.simbolo}
                        </span>
                      ) : c.visitas > 0 ? (
                        <span className="text-muted-foreground rounded border px-1.5 py-0.5 text-[11px]">
                          só brinde
                        </span>
                      ) : null}
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

                {c.proximo_agendamento && (
                  <p className="mt-2 rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
                    Próximo horário: {formatData(c.proximo_agendamento)} às {formatHora(c.proximo_agendamento)}
                  </p>
                )}

                {((extras.acomp.get(c.id) ?? []).some((a) => a.mensagem_em <= somarDias(hoje, 45) || a.mensagem_enviada) ||
                  (extras.cupons.get(c.id) ?? []).length > 0) && (
                  <div className="mt-2 space-y-2">
                    {(extras.cupons.get(c.id) ?? []).map((cu) => (
                      <CupomItem key={cu.id} c={cu} nome={c.nome} whatsapp={c.whatsapp} hoje={hoje} />
                    ))}
                    {(extras.acomp.get(c.id) ?? [])
                      .filter((a) => a.mensagem_em <= somarDias(hoje, 45))
                      .map((a) => (
                        <AcompanhamentoItem key={a.regra} a={a} hoje={hoje} />
                      ))}
                  </div>
                )}

                <StatusCampos c={c} hoje={hoje} />
                <ContatoCampos id={c.id} nome={c.nome} whatsapp={c.whatsapp} instagram={c.instagram} />
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
