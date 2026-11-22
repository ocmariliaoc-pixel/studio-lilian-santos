import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { dataBR, hojeISO, isDataISO, nomeMes } from "@/lib/financeiro";
import { CampoData } from "@/components/ui/campo-data";
import { DIA_DE_CURSO, ehSinal } from "@/lib/agenda";
import {
  atendimentosPorMes,
  atendimentosPorSemana,
  contaComoAtendimento,
  ehItemServico,
  leadsPorOrigem,
  nomeCurso,
  ranking,
} from "@/lib/resultados";
import { AtendimentosGrafico, LeadsGrafico, Ranking } from "./resultados-graficos";
import { inicioSemana, somarDias } from "@/lib/agenda";
import { calcularMeta, ultimoDiaDoMes, type ItemCusto, type ParametrosMeta } from "@/lib/metas";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { SomenteLeitura } from "@/components/somente-leitura";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { MetaForm } from "./meta-form";
import { DiasBotoes } from "./dias-botoes";
import { MetaGrafico, type PontoMeta } from "./meta-grafico";
import { diasAbertos, ESCALAS, type Escala } from "@/lib/metas";

export const metadata: Metadata = { title: "Resultados" };

function mesAnteriorOuProximo(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ m?: string; dias?: string; de?: string; ate?: string }> }) {
  const sp = await searchParams;
  const perfil = await getPerfil();
  const hoje = hojeISO();
  const mes = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : `${hoje.slice(0, 7)}-01`;
  const fim = ultimoDiaDoMes(mes);
  const semanaDe = inicioSemana(hoje);
  // Terça a sábado (padrão) ou terça a domingo: botões no topo; a escolha fica num cookie
  const doCookie = (await cookies()).get("metas_dias")?.value;
  const escala: Escala = sp.dias && sp.dias in ESCALAS ? (sp.dias as Escala) : doCookie && doCookie in ESCALAS ? (doCookie as Escala) : "ter-sab";

  const supabase = await createClient();
  // Período dos resultados: desde o primeiro lançamento (abertura) até hoje, ou o que a pessoa escolher
  const primeiro = await supabase.from("lancamentos").select("data").eq("cancelado", false).order("data").limit(1).maybeSingle();
  const inicioStudio = (primeiro.data?.data as string | undefined) ?? `${hoje.slice(0, 7)}-01`;
  let de = isDataISO(sp.de) ? sp.de : inicioStudio;
  let ate = isDataISO(sp.ate) ? sp.ate : hoje;
  if (de > ate) [de, ate] = [ate, de];
  const [lancP, agP, prodsP, clisP] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("tipo, valor, valor_liquido, categoria, descricao, data, produto_id, quantidade, agendamento_id")
      .eq("cancelado", false)
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("agendamentos")
      .select("inicio, status, itens:agendamento_itens(nome, valor)")
      .neq("status", "cancelado")
      .gte("inicio", `${de}T00:00:00-03:00`)
      .lte("inicio", `${ate}T23:59:59-03:00`),
    supabase.from("produtos").select("id, nome"),
    supabase
      .from("clientes")
      .select("origem, status, criado_em")
      .gte("criado_em", `${de}T00:00:00-03:00`)
      .lte("criado_em", `${ate}T23:59:59-03:00`),
  ]);
  const [meta, doMes, recentes, daSemana, contasFixas] = await Promise.all([
    supabase.from("metas").select("*").lte("mes", mes).order("mes", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("lancamentos")
      .select("valor, categoria, data")
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
    supabase
      .from("lancamentos")
      .select("valor")
      .eq("tipo", "entrada")
      .eq("cancelado", false)
      .gte("data", semanaDe)
      .lte("data", somarDias(semanaDe, 6)),
    supabase.from("contas_fixas").select("nome, categoria, valor, dias").eq("ativo", true).order("nome"),
  ]);

  if (meta.error || doMes.error) {
    return (
      <>
        <PageHeader titulo="Resultados" />
        <ErroMigracao arquivo="0009_metas.sql" />
      </>
    );
  }

  // Contas a pagar (contas fixas) entram na meta automaticamente: valor × vencimentos no mês
  const fixas = (contasFixas.data ?? []).map((c) => ({
    nome: `${c.nome} (contas a pagar)`,
    valor: Math.round(Number(c.valor) * (c.dias as number[]).length * 100) / 100,
    pessoas: c.categoria === "Pessoas",
  }));
  const extrasCustos = ((meta.data?.custos as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) }));
  const extrasPessoas = ((meta.data?.pessoas as ItemCusto[]) ?? []).map((i) => ({ nome: i.nome, valor: Number(i.valor) }));
  const parametros: ParametrosMeta = {
    mes,
    custos: [...fixas.filter((f) => !f.pessoas).map(({ nome, valor }) => ({ nome, valor })), ...extrasCustos],
    pessoas: [...fixas.filter((f) => f.pessoas).map(({ nome, valor }) => ({ nome, valor })), ...extrasPessoas],
    lucro_desejado: Number(meta.data?.lucro_desejado ?? 0),
    insumos_pct: Number(meta.data?.insumos_pct ?? 0),
    ticket_alvo: meta.data?.ticket_alvo ? Number(meta.data.ticket_alvo) : null,
    herdada: !!meta.data && meta.data.mes !== mes,
  };

  // ---- Resultados do período ----
  const lp = lancP.data ?? [];
  const entradasP = lp.filter((l) => l.tipo === "entrada");
  const arrecadado = entradasP.reduce((t, l) => t + Number(l.valor), 0);
  const arrecadadoLiq = entradasP.reduce((t, l) => t + Number(l.valor_liquido), 0);
  const gasto = lp.filter((l) => l.tipo === "saida").reduce((t, l) => t + Number(l.valor), 0);
  const datasAtend = entradasP.filter((l) => contaComoAtendimento(l)).map((l) => l.data as string);

  type ItemAg = { nome: string; valor: number };
  const ags = (agP.data ?? []) as { inicio: string; status: string; itens: ItemAg[] }[];
  const itensAg = ags.flatMap((a) => a.itens ?? []);
  const nomesProduto = new Map((prodsP.data ?? []).map((x) => [x.id as string, x.nome as string]));
  // Serviços: agenda + vendas antigas sem agendamento ("Design + Buço" conta os dois)
  const servicosRank = ranking([
    ...itensAg.filter((i) => ehItemServico(i.nome)).map((i) => ({ nome: i.nome, valor: Number(i.valor) })),
    ...entradasP
      .filter((l) => l.categoria === "Serviço" && !l.agendamento_id && !ehSinal(l.descricao) && !/a identificar/i.test(l.descricao))
      .flatMap((l) => String(l.descricao).replace(/\s*\(.*?\)\s*/g, " ").split(" + ").map((nome) => ({ nome }))),
  ]);
  const produtosRank = ranking(
    entradasP
      .filter((l) => l.categoria === "Produto")
      .map((l) => {
        // vendas antigas sem produto ligado: "2x Brinco 29,90" → 2 × "Brinco"
        const m = String(l.descricao).match(/^(\d+)\s*x\s+(.+?)(\s+\d+[.,]\d{2})?$/i);
        const ligado = l.produto_id ? nomesProduto.get(l.produto_id) : undefined;
        return {
          nome: ligado || (m ? m[2] : String(l.descricao).replace(/\s+\d+[.,]\d{2}$/, "")),
          qtd: ligado ? Number(l.quantidade) || 1 : m ? Number(m[1]) : Number(l.quantidade) || 1,
          valor: Number(l.valor),
        };
      })
  );
  const cursosRank = ranking([
    ...itensAg.filter((i) => /^curso\b/i.test(i.nome) && !DIA_DE_CURSO.test(i.nome)).map((i) => ({ nome: nomeCurso(i.nome), valor: Number(i.valor) })),
    ...entradasP
      .filter((l) => l.categoria === "Curso" && !l.agendamento_id && !ehSinal(l.descricao))
      .map((l) => ({ nome: nomeCurso(String(l.descricao)), valor: Number(l.valor) })),
  ]);
  const origens = leadsPorOrigem((clisP.data ?? []) as { origem: string | null; status: string }[]);

  const rec = recentes.data ?? [];
  const brutoRec = rec.reduce((s, l) => s + Number(l.valor), 0);
  const liqRec = rec.reduce((s, l) => s + Number(l.valor_liquido), 0);
  const servicosRec = rec.filter((l) => l.categoria === "Serviço");
  const abertos = Array.from({ length: 7 }, (_, d) => (ESCALAS[escala].dias as readonly number[]).includes(d));
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
  const pct = r.metaMes ? Math.round((faturado / r.metaMes) * 100) : 0;

  // Gráfico: acumulado por dia (até hoje no mês atual) × ritmo da meta (proporcional aos dias abertos)
  const diasNoMes = Number(fim.slice(8, 10));
  const porDia = new Map<number, number>();
  for (const l of entradasMes) porDia.set(Number(l.data.slice(8, 10)), (porDia.get(Number(l.data.slice(8, 10))) ?? 0) + Number(l.valor));
  let acc = 0;
  const pontos: PontoMeta[] = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = i + 1;
    const dataDia = `${mes.slice(0, 8)}${String(dia).padStart(2, "0")}`;
    acc += porDia.get(dia) ?? 0;
    const abertosAte = diasAbertos(mes, dataDia, abertos);
    return {
      dia,
      acumulado: dataDia <= hoje ? Math.round(acc * 100) / 100 : null,
      meta: r.diasAtendimento ? Math.round((r.metaMes * abertosAte * 100) / r.diasAtendimento) / 100 : 0,
    };
  });

  // Atendimentos × esperado (esperado = atendimentos do mês na meta, proporcional aos dias de atendimento)
  const barrasMes = atendimentosPorMes(datasAtend, de, ate, r.atendimentosMes, abertos);
  const barrasSemana = Object.fromEntries(
    barrasMes.map((b) => [b.chave, atendimentosPorSemana(datasAtend, `${b.chave}-01`, de, ate, r.atendimentosMes, abertos)])
  );
  const qs = (extra: string) => `/metas?de=${de}&ate=${ate}&dias=${escala}${extra}`;

  return (
    <>
      <PageHeader titulo="Resultados" descricao="Quanto entrou, quanto saiu, atendimentos, o que mais sai e de onde vêm as clientes." />

      {/* Período */}
      <form method="get" action="/metas" className="bg-card mb-4 flex flex-wrap items-end gap-3 rounded-xl border p-3">
        <input type="hidden" name="dias" value={escala} />
        <label className="space-y-1 text-xs font-medium">
          <span className="text-muted-foreground">Desde</span>
          <div className="w-40"><CampoData name="de" defaultValue={de} /></div>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span className="text-muted-foreground">Até</span>
          <div className="w-40"><CampoData name="ate" defaultValue={ate} /></div>
        </label>
        <Button type="submit">Ver</Button>
        {(de !== inicioStudio || ate !== hoje) && (
          <Button asChild variant="ghost">
            <Link href={`/metas?dias=${escala}`}>Desde a abertura</Link>
          </Button>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/financeiro?p=total&f=entradas" className="bg-card hover:bg-secondary/40 rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">Dinheiro arrecadado desde {dataBR(de)}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatMoeda(arrecadado)}</p>
          <p className="text-muted-foreground text-xs">líquido (sem taxas): {formatMoeda(arrecadadoLiq)}</p>
        </Link>
        <Link href="/financeiro?p=total&f=saidas" className="bg-card hover:bg-secondary/40 rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">Dinheiro gasto até {dataBR(ate)}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatMoeda(gasto)}</p>
          <p className="text-muted-foreground text-xs">desde {dataBR(de)} · inclui investimento de abertura</p>
        </Link>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">Saldo do período (líquido − gasto)</p>
          <p className={cn("mt-1 text-3xl font-semibold tracking-tight tabular-nums", arrecadadoLiq - gasto < 0 && "text-destructive")}>
            {formatMoeda(arrecadadoLiq - gasto)}
          </p>
          <p className="text-muted-foreground text-xs">{datasAtend.length} atendimentos no período</p>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-sans text-base font-semibold">Atendimentos × esperado na meta</h2>
      <AtendimentosGrafico meses={barrasMes} semanas={barrasSemana} />

      <h2 className="mt-8 mb-3 font-sans text-base font-semibold">O que mais sai</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Ranking titulo="Serviços mais procurados" itens={servicosRank} unidade={["vez", "vezes"]} vazio="Nenhum serviço no período." href="/produtos?aba=servicos" />
        <Ranking titulo="Produtos mais vendidos" itens={produtosRank} unidade={["unidade", "unidades"]} vazio="Nenhum produto vendido no período." href="/produtos" />
        <Ranking titulo="Cursos mais realizados" itens={cursosRank} unidade={["turma", "turmas"]} vazio="Nenhum curso no período." />
      </div>

      <h2 className="mt-8 mb-3 font-sans text-base font-semibold">Leads</h2>
      <LeadsGrafico origens={origens} />

      <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <h2 className="font-sans text-base font-semibold">Meta do mês</h2>
        {admin ? (
          <MetaForm parametros={{ ...parametros, custos: extrasCustos, pessoas: extrasPessoas }} nomeMes={titulo} />
        ) : (
          <SomenteLeitura />
        )}
      </div>

      <DiasBotoes escala={escala} mes={mes} periodo={`&de=${de}&ate=${ate}`} />

      <div className="mb-5 flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Mês anterior">
          <Link href={qs(`&m=${mesAnteriorOuProximo(mes, -1).slice(0, 7)}`)}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <p className="text-2xl font-semibold first-letter:uppercase">{titulo}</p>
        <Button asChild variant="ghost" size="icon" aria-label="Próximo mês">
          <Link href={qs(`&m=${mesAnteriorOuProximo(mes, 1).slice(0, 7)}`)}>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>

      {/* Faturado em destaque, % da meta e a meta à direita */}
      <section className="bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Faturado</p>
            <Link
              href={`/financeiro?p=mes&d=${mes}&f=entradas`}
              className="hover:text-gold-dark mt-1 block text-4xl font-semibold tracking-tight tabular-nums underline-offset-8 hover:underline sm:text-5xl"
              aria-label="Ver as entradas do mês"
            >
              {formatMoeda(faturado)}
            </Link>
            <Link href={`/financeiro?p=mes&d=${mes}&f=entradas`} className="text-muted-foreground text-xs underline">
              ver as entradas e exportar Excel
            </Link>
            <p className="mt-1 text-lg font-semibold text-gold-dark tabular-nums">{pct}% da meta</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Meta do mês</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{formatMoeda(r.metaMes)}</p>
            <p className="text-muted-foreground text-sm">
              {r.falta > 0 ? `faltam ${formatMoeda(r.falta)}` : "meta batida 🎉"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {/* barra em degradê dourado; o número da % está ao lado (cor nunca sozinha) */}
          <div
            className="bg-secondary relative h-4 overflow-hidden rounded-full"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={r.metaMes}
            aria-valuenow={faturado}
            aria-label={`Faturado: ${pct}% da meta`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: "linear-gradient(90deg, #7f6630 0%, #ad8f47 55%, #e2c97f 100%)",
              }}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex justify-between text-[11px] tabular-nums">
            <span>0</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          {ehMesAtual && r.falta > 0 && r.diasRestantes > 0 && (
            <p className="bg-secondary/60 mt-3 rounded-md px-3 py-2 text-sm">
              Para bater: <b>{formatMoeda(r.faltaPorDia)} por dia</b> nos {r.diasRestantes} dias de atendimento que restam · ≈{" "}
              {r.atendimentosFaltam} atendimentos
            </p>
          )}
        </div>
      </section>

      <div className="mt-4">
        <MetaGrafico pontos={pontos} metaMes={r.metaMes} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Por semana" valor={formatMoeda(r.metaSemana)} detalhe={ehMesAtual ? `esta semana: ${formatMoeda(semana)}` : undefined} />
        <Indicador titulo="Por dia de atendimento" valor={formatMoeda(r.metaDia)} detalhe={`${r.diasAtendimento} dias (${ESCALAS[escala].rotulo.toLowerCase()})`} />
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
        <p className="text-muted-foreground border-b px-5 py-2 text-xs">
          As contas fixas vêm de Financeiro → Contas a pagar (mudou lá, muda aqui). Em &ldquo;Ajustar números&rdquo; ficam só os
          custos que não são conta fixa (ex.: insumos) e o lucro desejado.
        </p>
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
