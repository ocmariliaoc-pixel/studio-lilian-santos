import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPerfil, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, nomeMes } from "@/lib/financeiro";
import { contasDoMes, type ContaFixa, type Pagamento } from "@/lib/contas";
import { ultimoDiaDoMes } from "@/lib/metas";
import { ErroMigracao } from "@/components/erro-migracao";
import { Button } from "@/components/ui/button";
import { ContasPagar } from "./contas-pagar";

export const metadata: Metadata = { title: "Contas a pagar" };

function mesVizinho(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function ContasPagarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const perfil = await getPerfil();
  const hoje = hojeISO();
  const mes = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : `${hoje.slice(0, 7)}-01`;

  const supabase = await createClient();
  const [contas, pagos] = await Promise.all([
    supabase.from("contas_fixas").select("id, nome, categoria, valor, dias, ativo").order("nome"),
    supabase
      .from("lancamentos")
      .select("id, conta_fixa_id, vencimento, data, valor")
      .not("conta_fixa_id", "is", null)
      .eq("cancelado", false)
      .gte("vencimento", mes)
      .lte("vencimento", ultimoDiaDoMes(mes)),
  ]);
  if (contas.error || pagos.error) return <ErroMigracao arquivo="0012_contas_extrato.sql" />;

  const lista = (contas.data ?? []).map((c) => ({ ...c, valor: Number(c.valor) })) as ContaFixa[];
  const pagamentos = (pagos.data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as Pagamento[];
  const [a, m] = mes.split("-").map(Number);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Mês anterior">
          <Link href={`/financeiro/pagar?m=${mesVizinho(mes, -1)}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <p className="text-xl font-semibold first-letter:uppercase">
          {nomeMes(m)} de {a}
        </p>
        <Button asChild variant="ghost" size="icon" aria-label="Próximo mês">
          <Link href={`/financeiro/pagar?m=${mesVizinho(mes, 1)}`}>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>
      <ContasPagar itens={contasDoMes(lista, pagamentos, mes, hoje)} contas={lista} hoje={hoje} admin={isAdmin(perfil)} />
    </>
  );
}
