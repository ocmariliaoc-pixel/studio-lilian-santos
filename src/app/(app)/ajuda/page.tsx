import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Lis" };

export default async function AjudaPage() {
  const perfil = await requireAdmin();
  return (
    <>
      <PageHeader
        titulo="Lis"
        descricao="Sua assistente de gestão: tira dúvidas do sistema, analisa os números do studio e sugere o que fazer."
      />
      <Chat nome={perfil.nome.split(" ")[0]} />
    </>
  );
}
