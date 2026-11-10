import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { FORMAS_PAGAMENTO, type TaxaPagamento } from "@/lib/configuracoes";
import {
  balancoMensal,
  calcularPeriodo,
  hojeISO,
  isDataISO,
  lancamentoDaLinha,
  resumir,
  type TipoPeriodo,
} from "@/lib/financeiro";
import { ErroMigracao } from "@/components/erro-migracao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Caixa } from "./caixa";
import { BalancoMensal } from "./balanco-mensal";
import { CategoriasSaidas } from "./categorias-saidas";

export const metadata: Metadata = { title: "Financeiro" };

const ABAS: { tipo: TipoPeriodo; label: string }[] = [
  { tipo: "dia", label: "Dia" },
  { tipo: "semana", label: "Semana" },
  { tipo: "mes", label: "Mês" },
  { tipo: "ano", label: "Ano" },
  { tipo: "total", label: "Total" },
];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; d?: string }>;
}) {
  const sp = await searchParams;
  const perfil = await getPerfil();
  const hoje = hojeISO();
  const tipo: TipoPeriodo = ABAS.some((a) => a.tipo === sp.p) ? (sp.p as TipoPeriodo) : "mes";
  const ref = isDataISO(sp.d) ? sp.d : hoje;
  const periodo = calcularPeriodo(tipo, ref);

  const supabase = await createClient();
  const [lanc, taxas, servicos, produtos, clientes] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("*, autora:perfis!lancamentos_criado_por_fkey(nome)")
      .gte("data", periodo.de)
      .lte("data", periodo.ate)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false }),
    supabase.from("taxas_pagamento").select("forma, parcelas, taxa_percentual, ativo"),
    supabase.from("servicos").select("nome").eq("ativo", true).order("nome"),
    supabase
      .from("produtos")
      .select("id, nome, categoria, preco, estoque, controla_estoque")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("clientes").select("nome").order("nome"),
  ]);

  if (lanc.error || taxas.error) {
    return (
      <>
        <ErroMigracao arquivo="0003_lancamentos.sql" />
      </>
    );
  }

  const lancamentos = (lanc.data ?? []).map(lancamentoDaLinha);
  const resumo = resumir(lancamentos);
  const href = (p: TipoPeriodo, d: string) => `/financeiro?p=${p}&d=${d}`;

  return (
    <>

      {/* Período */}
      <div className="space-y-3">
        <div className="bg-secondary/60 grid grid-cols-5 gap-1 rounded-xl p-1 sm:inline-grid sm:w-[30rem]">
          {ABAS.map((a) => (
            <Link
              key={a.tipo}
              href={href(a.tipo, ref)}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-xs font-medium sm:text-sm",
                tipo === a.tipo ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {a.label}
            </Link>
          ))}
        </div>
        <div className={cn("flex items-center justify-between gap-2", tipo === "total" && "justify-center")}>
          <Button asChild variant="ghost" size="icon" aria-label="Período anterior" className={cn(tipo === "total" && "hidden")}>
            <Link href={href(tipo, periodo.anterior)}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold first-letter:uppercase">{periodo.titulo}</p>
            {tipo !== "total" && !(periodo.de <= hoje && hoje <= periodo.ate) && (
              <Link href={href(tipo, hoje)} className="text-primary text-xs font-medium">
                voltar para hoje
              </Link>
            )}
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="Próximo período" className={cn(tipo === "total" && "hidden")}>
            <Link href={href(tipo, periodo.proximo)}>
              <ChevronRight className="size-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Entradas" valor={resumo.entradasBruto} detalhe={`${resumo.qtdEntradas} recebimentos`} />
        <Indicador
          titulo="Líquido"
          valor={resumo.entradasLiquido}
          detalhe={`taxas ${formatMoeda(resumo.taxas)}`}
        />
        <Indicador
          titulo="Saídas"
          valor={resumo.saidas}
          cor="saida"
          detalhe={
            resumo.saidasInvestimento || resumo.saidasCaucao
              ? [
                  resumo.saidasInvestimento ? `abertura ${formatMoeda(resumo.saidasInvestimento)}` : "",
                  resumo.saidasCaucao ? `caução ${formatMoeda(resumo.saidasCaucao)}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
        />
        <Indicador
          titulo="Saldo"
          valor={resumo.saldo}
          detalhe="líquido − saídas"
          cor={resumo.saldo >= 0 ? "entrada" : "saida"}
          destaque
        />
      </div>
      {resumo.brindes > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          + {resumo.brindes} {resumo.brindes === 1 ? "brinde" : "brindes"} (sem cobrança)
        </p>
      )}

      {resumo.porForma.length > 0 && (
        <Card className="mt-5 gap-0 py-0">
          <CardContent className="divide-y px-0">
            <p className="text-muted-foreground px-4 py-3 text-xs font-semibold tracking-widest uppercase">
              Por forma de pagamento
            </p>
            {resumo.porForma.map((f) => (
              <div key={f.forma} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{FORMAS_PAGAMENTO[f.forma]}</span>
                <span className="text-right">
                  <span className="font-medium">{formatMoeda(f.bruto)}</span>
                  {f.taxas > 0 && (
                    <span className="text-muted-foreground block text-xs">
                      − {formatMoeda(f.taxas)} = {formatMoeda(f.liquido)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CategoriasSaidas lancamentos={lancamentos} />

      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{tipo === "ano" || tipo === "total" ? "Resumo" : "Lançamentos"}</h2>
        <Button asChild variant="outline">
          <a href={`/financeiro/exportar?p=${tipo}&d=${ref}`}>
            <Download />
            Exportar Excel
          </a>
        </Button>
      </div>

      {(tipo === "ano" || tipo === "total") && <BalancoMensal linhas={balancoMensal(lancamentos)} />}

      <Caixa
        lancamentos={lancamentos}
        mostrarLista={tipo !== "ano" && tipo !== "total"}
        semBotao
        meuId={perfil.id}
        admin={isAdmin(perfil)}
        dados={{
          hoje,
          taxas: (taxas.data ?? []).map((t) => ({
            ...t,
            taxa_percentual: Number(t.taxa_percentual),
          })) as TaxaPagamento[],
          sugestoes: (servicos.data ?? []).map((s) => s.nome),
          clientes: (clientes.data ?? []).map((c) => c.nome),
          // Sem a migração 0004 a consulta falha e a venda de produto fica indisponível
          produtos: (produtos.data ?? []).map((p) => ({
            ...p,
            preco: Number(p.preco),
            controla_estoque: p.controla_estoque !== false,
          })),
        }}
      />
    </>
  );
}

function Indicador({
  titulo,
  valor,
  detalhe,
  cor,
  destaque,
}: {
  titulo: string;
  valor: number;
  detalhe?: string;
  cor?: "entrada" | "saida";
  destaque?: boolean;
}) {
  return (
    <div className={cn("bg-card rounded-xl border p-4", destaque && "border-primary/30 bg-secondary/40")}>
      <p className="text-muted-foreground text-xs font-medium">{titulo}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight sm:text-xl",
          cor === "entrada" && "text-emerald-700",
          cor === "saida" && "text-rose-700"
        )}
      >
        {formatMoeda(valor)}
      </p>
      {detalhe && <p className="text-muted-foreground mt-0.5 text-xs">{detalhe}</p>}
    </div>
  );
}
