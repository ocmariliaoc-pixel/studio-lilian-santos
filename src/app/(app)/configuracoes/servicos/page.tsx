import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Servico } from "@/lib/configuracoes";
import { ErroMigracao } from "@/components/erro-migracao";
import { ServicosLista } from "./servicos-lista";
import { BlackLSCard } from "./black-ls-card";
import { hojeISO } from "@/lib/financeiro";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, categoria, duracao_min, preco, retorno_dias, ativo")
    .order("nome");

  if (error) {
    return <ErroMigracao />;
  }

  const servicos: Servico[] = (data ?? []).map((s) => ({ ...s, preco: Number(s.preco) }));
  return (
    <div className="space-y-5">
      <BlackLSCard servicos={servicos} hoje={hojeISO()} />
      <ServicosLista servicos={servicos} />
    </div>
  );
}
