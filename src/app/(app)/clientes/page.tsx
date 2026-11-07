import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <PageHeader titulo="Clientes" descricao="Cadastro, fichas e anamnese." />
      <EmBreve
        fase={3}
        itens={[
          "Lista com busca e filtros",
          "Ficha completa da cliente",
          "Anamnese",
          "WhatsApp com mensagem pronta",
        ]}
      />
    </>
  );
}
