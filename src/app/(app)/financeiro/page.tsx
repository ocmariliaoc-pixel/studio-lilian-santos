import type { Metadata } from "next";
import { getPerfil, isAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmBreve } from "@/components/em-breve";
import { SomenteLeitura } from "@/components/somente-leitura";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const perfil = await getPerfil();
  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Entradas, saídas e lucro do mês.">
        {!isAdmin(perfil) && <SomenteLeitura />}
      </PageHeader>
      <EmBreve
        fase={5}
        itens={[
          "Receitas e despesas do mês",
          "Receita por forma de pagamento e serviço",
          "Lançamento rápido de despesa",
          "Pacotes e comparativo com o mês anterior",
        ]}
      />
    </>
  );
}
