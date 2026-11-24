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
        descricao="Tira-dúvidas do sistema: regras, definições, como fazer e o que dá para ajustar."
      />
      <Chat nome={perfil.nome.split(" ")[0]} />
    </>
  );
}
