import { CalendarDays, Cake, Target, TrendingUp, UserRoundCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { getPerfil, isAdmin } from "@/lib/auth";
import { formatDataExtenso, saudacao } from "@/lib/format";
import { lerStatusInventario } from "@/lib/produtos-server";
import { AlertaInventario } from "@/components/alerta-inventario";
import { MensagensDoDia } from "@/components/mensagens-do-dia";
import { AcoesRapidas } from "@/components/acoes-rapidas";
import { AgendaHoje } from "@/components/agenda-hoje";
import { ChecklistHoje } from "@/components/checklist-hoje";
import { createClient } from "@/lib/supabase/server";
import type { TaxaPagamento } from "@/lib/configuracoes";
import { hojeISO } from "@/lib/financeiro";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Atalho = { href: string; titulo: string; descricao: string; icon: typeof Wallet };

const ATALHOS_ADMIN: Atalho[] = [
  { href: "/financeiro", titulo: "Financeiro", descricao: "Entradas, saídas e saldo do mês", icon: Wallet },
  { href: "/metas", titulo: "Metas", descricao: "Meta x realizado por indicador", icon: Target },
  { href: "/agenda?v=dia", titulo: "Agenda de hoje", descricao: "Horários e confirmações", icon: CalendarDays },
  { href: "/clientes", titulo: "Clientes", descricao: "Retornos e aniversariantes", icon: Users },
];

const ATALHOS_PROFISSIONAL: Atalho[] = [
  { href: "/agenda?v=dia", titulo: "Atendimentos de hoje", descricao: "Status e WhatsApp da cliente", icon: CalendarDays },
  { href: "/clientes", titulo: "Fichas das clientes", descricao: "Dados, anamnese e histórico", icon: UserRoundCheck },
  { href: "/clientes", titulo: "Aniversariantes", descricao: "Clientes que fazem aniversário na semana", icon: Cake },
  { href: "/financeiro", titulo: "Caixa", descricao: "Lançar entradas e saídas", icon: TrendingUp },
];

export default async function InicioPage() {
  const perfil = await getPerfil();
  const admin = isAdmin(perfil);
  const atalhos = admin ? ATALHOS_ADMIN : ATALHOS_PROFISSIONAL;
  const primeiroNome = perfil.nome.split(" ")[0];
  const inventario = await lerStatusInventario();
  const hoje = hojeISO();

  // Dados do formulário de venda/despesa
  const supabase = await createClient();
  const [taxas, servicos, produtos, clientes] = await Promise.all([
    supabase.from("taxas_pagamento").select("forma, parcelas, taxa_percentual, ativo"),
    supabase.from("servicos").select("nome, preco").eq("ativo", true).order("nome"),
    supabase.from("produtos").select("id, nome, categoria, preco, estoque, controla_estoque").eq("ativo", true).order("nome"),
    supabase.from("clientes").select("nome").order("nome"),
  ]);
  const dados = {
    hoje,
    taxas: (taxas.data ?? []).map((t) => ({ ...t, taxa_percentual: Number(t.taxa_percentual) })) as TaxaPagamento[],
    sugestoes: (servicos.data ?? []).map((x) => x.nome),
    servicos: (servicos.data ?? []).map((x) => ({ nome: x.nome, preco: Number(x.preco) })),
    produtos: (produtos.data ?? []).map((p) => ({ ...p, preco: Number(p.preco), controla_estoque: p.controla_estoque !== false })),
    clientes: (clientes.data ?? []).map((c) => c.nome),
  };

  return (
    <div className="space-y-6">
      <AcoesRapidas dados={dados} />

      <div>
        <p className="text-muted-foreground text-sm first-letter:uppercase">{formatDataExtenso(new Date())}</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {admin
            ? "Aqui você acompanha faturamento, metas e pendências do studio."
            : "Aqui ficam seus atendimentos do dia e as fichas das clientes."}
        </p>
      </div>

      <AlertaInventario status={inventario} />

      <AgendaHoje hoje={hoje} />

      <ChecklistHoje hoje={hoje} meuId={perfil.id} />

      <MensagensDoDia hoje={hoje} />

      <div className="grid gap-4 sm:grid-cols-2">
        {atalhos.map(({ href, titulo, descricao, icon: Icon }) => (
          <Link key={titulo} href={href} className="group">
            <Card className="group-hover:border-primary/40 h-full gap-3 py-5 transition-colors">
              <CardHeader className="flex items-center gap-4 px-5">
                <span className="bg-secondary text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base">{titulo}</CardTitle>
                  <CardDescription>{descricao}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}
