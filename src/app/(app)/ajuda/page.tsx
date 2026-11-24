import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Tira-dúvidas" };

export default async function AjudaPage() {
  const perfil = await requireAdmin();
  return (
    <>
      <PageHeader
        titulo="Tira-dúvidas"
        descricao="Pergunte sobre as regras do sistema, o que cada número significa e o que dá para ajustar."
      />
      <Chat nome={perfil.nome.split(" ")[0]} />
    </>
  );
}
