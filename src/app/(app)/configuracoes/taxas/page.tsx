import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { TaxaPagamento } from "@/lib/configuracoes";
import { ErroMigracao } from "@/components/erro-migracao";
import { TaxasForm } from "./taxas-form";

export const metadata: Metadata = { title: "Taxas" };

export default async function TaxasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxas_pagamento")
    .select("forma, parcelas, taxa_percentual, ativo")
    .order("parcelas");

  if (error || !data?.length) return <ErroMigracao />;

  const taxas: TaxaPagamento[] = data.map((t) => ({
    ...t,
    taxa_percentual: Number(t.taxa_percentual),
  })) as TaxaPagamento[];

  return <TaxasForm taxas={taxas} />;
}
