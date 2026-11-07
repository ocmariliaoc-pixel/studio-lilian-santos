import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { EsqueciForm } from "./form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenhaPage() {
  return (
    <AuthShell
      titulo="Esqueci a senha"
      descricao="Informe seu e-mail e enviaremos um link para criar uma senha nova."
      rodape={
        <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <EsqueciForm />
    </AuthShell>
  );
}
