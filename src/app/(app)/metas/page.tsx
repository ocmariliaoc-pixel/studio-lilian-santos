import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { hojeISO, nomeMes } from "@/lib/financeiro";
import { inicioSemana, somarDias } from "@/lib/agenda";
import { calcularMeta, ultimoDiaDoMes, type ItemCusto, type ParametrosMeta } from "@/lib/metas";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { SomenteLeitura } from "@/components/somente-leitura";
import { Button } from "@/components/ui/button";
import { MetaForm } from "./meta-form";

export const metadata: Metadata = { title: "Metas" };

function mesAnteriorOuProximo(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const perfil = await getPerfil();
  const hoje = hojeISO();
  const mes = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : `${hoje.slice(0, 7)}-01`;
  const fim = ultimoDiaDoMes(mes);
  const semanaDe = inicioSemana(hoje);

  const supabase = await createClient();
  const [meta, doMes, recentes, horarios, daSemana] = await Promise.all([
    supabase.from("metas").select("*").lte("mes", mes).order("mes", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("lancamentos")
      .select("valor, categoria")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .gte("data", mes)
      .lte("data", fim),
    supabase
      .from("lancamentos")
      .select("valor, valor_liquido, categoria")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .gt("valor", 0)
      .gte("data", somarDias(hoje, -90)),
    supabase.from("horarios_funcionamento").select("dia_semana, aberto"),
    supabase
      .from("lancamentos")
      .select("valor")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .gte("data", semanaDe)
      .lte("data", somarDias(semanaDe, 6)),
  ]);

  if (meta.error || doMes.error) {
    return (
      <>
        <PageHeader titulo="Metas" />
        <ErroMigracao arquivo="0009_metas.sql" />
      </>
    );
  }

  const parametros: ParametrosMeta = {
    mes,
    custos: ((meta.data?.custos as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) })),
    pessoas: ((meta.data?.pessoas as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) })),
    lucro_desejado: Number(meta.data?.lucro_desejado ?? 0),
    insumos_pct: Number(meta.data?.insumos_pct ?? 0),
    ticket_alvo: meta.data?.ticket_alvo ? Number(meta.data.ticket_alvo) : null,
    herdada: !!meta.data && meta.data.mes !== mes,
  };

  const rec = recentes.data ?? [];
  const brutoRec = rec.reduce((s, l) => s + Number(l.valor), 0);
  const liqRec = rec.reduce((s, l) => s + Number(l.valor_liquido), 0);
  const servicosRec = rec.filter((l) => l.categoria === "Serviço");
  const abertos = Array.from({ length: 7 }, (_, d) => !!horarios.data?.find((h) => h.dia_semana === d)?.aberto);
  const entradasMes = doMes.data ?? [];

  const r = calcularMeta(parametros, {
    taxaMediaPct: brutoRec ? Math.round(((brutoRec - liqRec) / brutoRec) * 1000) / 10 : 3.6,
    ticketReal: servicosRec.length
      ? Math.round((servicosRec.reduce((s, l) => s + Number(l.valor), 0) / servicosRec.length) * 100) / 100
      : null,
    diasAbertosSemana: abertos,
    hoje,
    faturadoMes: entradasMes.reduce((s, l) => s + Number(l.valor), 0),
    atendimentosMes: entradasMes.filter((l) => l.categoria === "Serviço" && Number(l.valor) > 0).length,
    faturadoSemana: (daSemana.data ?? []).reduce((s, l) => s + Number(l.valor), 0),
  });
  const faturado = entradasMes.reduce((s, l) => s + Number(l.valor), 0);
  const atendidos = entradasMes.filter((l) => l.categoria === "Serviço" && Number(l.valor) > 0).length;
  const semana = (daSemana.data ?? []).reduce((s, l) => s + Number(l.valor), 0);
  const ehMesAtual = mes.slice(0, 7) === hoje.slice(0, 7);
  const [ano, m] = mes.split("-").map(Number);
  const titulo = `${nomeMes(m)} de ${ano}`;
  const admin = isAdmin(perfil);

  return (
    <>
      <PageHeader titulo="Metas" descricao="Quanto o studio precisa faturar para pagar tudo e dar lucro.">
        {admin ? <MetaForm parametros={parametros} nomeMes={titulo} /> : <SomenteLeitura />}
      </PageHeader>

      <div className="mb-5 flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Mês anterior">
          <Link href={`/metas?m=${mesAnteriorOuProximo(mes, -1).slice(0, 7)}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <p className="text-2xl font-semibold first-letter:uppercase">{titulo}</p>
        <Button asChild variant="ghost" size="icon" aria-label="Próximo mês">
          <Link href={`/metas?m=${mesAnteriorOuProximo(mes, 1).slice(0, 7)}`}>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>

      {/* Meta do mês: um número só, com o medidor do realizado */}
      <section className="bg-card rounded-xl border p-5">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Meta de faturamento</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{formatMoeda(r.metaMes)}</p>
        <div className="mt-4">
          <div className="bg-secondary h-3 overflow-hidden rounded-full" role="meter" aria-valuemin={0} aria-valuemax={r.metaMes} aria-valuenow={faturado} aria-label="Faturado do mês">
            <div className="bg-primary h-full rounded-full" style={{ width: `${r.progresso * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
            <span>
              <b className="tabular-nums">{formatMoeda(faturado)}</b> faturado ({Math.round(r.progresso * 100)}%)
            </span>
            <span className="text-muted-foreground">
              {r.falta > 0 ? `faltam ${formatMoeda(r.falta)}` : "meta batida 🎉"}
            </span>
          </div>
          {ehMesAtual && r.falta > 0 && r.diasRestantes > 0 && (
            <p className="bg-secondary/60 mt-3 rounded-md px-3 py-2 text-sm">
              Para bater: <b>{formatMoeda(r.faltaPorDia)} por dia</b> nos {r.diasRestantes} dias de atendimento que
              restam · ≈ {r.atendimentosFaltam} atendimentos
            </p>
          )}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Por semana" valor={formatMoeda(r.metaSemana)} detalhe={ehMesAtual ? `esta semana: ${formatMoeda(semana)}` : undefined} />
        <Indicador titulo="Por dia de atendimento" valor={formatMoeda(r.metaDia)} detalhe={`${r.diasAtendimento} dias abertos no mês`} />
        <Indicador titulo="Atendimentos no mês" valor={String(r.atendimentosMes)} detalhe={`${atendidos} feitos · ≈ ${r.atendimentosSemana}/semana · ${String(r.atendimentosDia).replace(".", ",")}/dia`} />
        <Indicador
          titulo="Ticket médio"
          valor={formatMoeda(r.ticket)}
          detalhe={r.ticketOrigem === "real" ? "real, últimos 90 dias" : r.ticketOrigem === "definido" ? "definido na meta" : "estimado"}
        />
      </div>

      {/* Como a meta foi calculada */}
      <section className="bg-card mt-6 rounded-xl border">
        <h2 className="border-b px-5 py-3 font-sans text-sm font-semibold">Como a meta é calculada</h2>
        {parametros.herdada && (
          <p className="text-muted-foreground border-b px-5 py-2 text-xs">Usando os números do último mês com meta salva.</p>
        )}
        <dl className="divide-y text-sm">
          {[...parametros.custos, ...parametros.pessoas].map((i, k) => (
            <div key={k} className="flex justify-between px-5 py-2">
              <dt className="text-muted-foreground">{i.nome}</dt>
              <dd className="tabular-nums">{formatMoeda(i.valor)}</dd>
            </div>
          ))}
          <div className="flex justify-between px-5 py-2">
            <dt className="text-muted-foreground">Lucro desejado</dt>
            <dd className="tabular-nums">{formatMoeda(parametros.lucro_desejado)}</dd>
          </div>
          <div className="flex justify-between px-5 py-2 font-medium">
            <dt>Precisa sobrar no mês</dt>
            <dd className="tabular-nums">{formatMoeda(r.precisa)}</dd>
          </div>
          <div className="flex justify-between px-5 py-2">
            <dt className="text-muted-foreground">
              + taxas da maquininha ({String(Math.round((r.descontosPct - parametros.insumos_pct) * 10) / 10).replace(".", ",")}%) e
              insumos ({String(parametros.insumos_pct).replace(".", ",")}%)
            </dt>
            <dd className="tabular-nums">{formatMoeda(r.metaMes - r.precisa)}</dd>
          </div>
          <div className="flex justify-between px-5 py-3 text-base font-semibold">
            <dt>Meta de faturamento</dt>
            <dd className="tabular-nums">{formatMoeda(r.metaMes)}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

function Indicador({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{valor}</p>
      {detalhe && <p className="text-muted-foreground mt-0.5 text-xs">{detalhe}</p>}
    </div>
  );
}
