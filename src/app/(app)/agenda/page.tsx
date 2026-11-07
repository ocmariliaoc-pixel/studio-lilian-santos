import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmBreve } from "@/components/em-breve";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <>
      <PageHeader titulo="Agenda" descricao="Atendimentos da Lilian por dia e semana." />
      <EmBreve
        fase={4}
        itens={[
          "Visão de dia e semana",
          "Agendar tocando num horário livre",
          "Mudar status com um toque",
          "Bloqueios e regra de conflito",
        ]}
      />
    </>
  );
}
