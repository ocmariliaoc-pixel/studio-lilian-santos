import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/financeiro";
import type { ClienteResumo } from "@/lib/clientes";
import type { Acompanhamento, Cupom } from "@/lib/acompanhamentos";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { ClientesLista } from "./clientes-lista";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ f?: string; c?: string }> }) {
  const { f, c } = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, acomp, cupons] = await Promise.all([
    supabase.from("clientes_resumo").select("*"),
    supabase.from("acompanhamentos").select("*").order("ordem"),
    supabase.from("cupons").select("*").order("valido_ate"),
  ]);

  if (error) {
    return (
      <>
        <PageHeader titulo="Clientes" />
        <ErroMigracao arquivo="0006_clientes.sql" />
      </>
    );
  }

  const clientes: ClienteResumo[] = (data ?? []).map((c) => ({
    ...c,
    ultimo_pagamento_valor: c.ultimo_pagamento_valor == null ? null : Number(c.ultimo_pagamento_valor),
    visitas: Number(c.visitas),
    total_gasto: Number(c.total_gasto),
  }));

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Leads, clientes e quanto cada uma gastou. Ficha completa e anamnese chegam na fase 3."
      >
        <Button asChild variant="outline">
          <a href="/clientes/exportar">
            <Download /> Baixar Excel
          </a>
        </Button>
      </PageHeader>
      <ClientesLista
        clientes={clientes}
        hoje={hojeISO()}
        acompanhamentos={(acomp.data ?? []) as Acompanhamento[]}
        cupons={((cupons.data ?? []) as Cupom[]).map((c) => ({ ...c, percentual: Number(c.percentual) }))}
        filtroInicial={f}
        clienteInicial={c && /^[0-9a-f-]{36}$/i.test(c) ? c : undefined}
      />
    </>
  );
}
