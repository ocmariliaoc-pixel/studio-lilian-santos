import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPerfil, isAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const perfil = await getPerfil();
  if (!isAdmin(perfil)) redirect("/");

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Serviços, horários, taxas e usuárias." />
      <EmBreve
        fase={2}
        itens={["Serviços e preços", "Horários de funcionamento", "Taxas da maquininha", "Usuárias"]}
      />
    </>
  );
}
