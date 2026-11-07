import type { Metadata } from "next";
import { getPerfil } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { NovaSenhaForm } from "./form";

export const metadata: Metadata = { title: "Nova senha" };

export default async function RedefinirSenhaPage() {
  // Exige a sessão criada pelo link do e-mail (sem sessão → /login).
  const perfil = await getPerfil();

  return (
    <AuthShell titulo="Nova senha" descricao={`Crie uma senha nova para ${perfil.email}.`}>
      <NovaSenhaForm />
    </AuthShell>
  );
}
