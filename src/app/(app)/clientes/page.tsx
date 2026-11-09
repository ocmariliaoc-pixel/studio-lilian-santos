import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/financeiro";
import type { ClienteResumo } from "@/lib/clientes";
import { PageHeader } from "@/components/page-header";
import { ErroMigracao } from "@/components/erro-migracao";
import { ClientesLista } from "./clientes-lista";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes_resumo").select("*");

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
        descricao="Quem já veio ao studio, o que fez e quanto gastou. Ficha completa e anamnese chegam na fase 3."
      />
      <ClientesLista clientes={clientes} hoje={hojeISO()} />
    </>
  );
}
