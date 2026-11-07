import type { Metadata } from "next";
import { getPerfil, isAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmBreve } from "@/components/em-breve";
import { SomenteLeitura } from "@/components/somente-leitura";

export const metadata: Metadata = { title: "Metas" };

export default async function MetasPage() {
  const perfil = await getPerfil();
  return (
    <>
      <PageHeader titulo="Metas" descricao="Meta x realizado do mês.">
        {!isAdmin(perfil) && <SomenteLeitura />}
      </PageHeader>
      <EmBreve
        fase={6}
        itens={[
          "Definir metas do mês",
          "Quanto falta por dia útil",
          "Histórico dos últimos 12 meses",
        ]}
      />
    </>
  );
}
