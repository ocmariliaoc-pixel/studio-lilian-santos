import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";
import { RecoveryHandler } from "./recovery-handler";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;

  return (
    <AuthShell
      titulo="Bem-vinda"
      descricao="Acesse com o e-mail e a senha criados pela administração."
      rodape={<p className="text-xs">Acesso restrito à equipe do studio.</p>}
    >
      <RecoveryHandler />
      {erro === "link" && (
        <p role="alert" className="bg-destructive/10 text-destructive mb-5 rounded-md p-3 text-sm">
          Esse link expirou ou já foi usado. Peça um novo em &ldquo;Esqueci minha senha&rdquo;.
        </p>
      )}
      {erro === "inativa" && (
        <p role="alert" className="bg-destructive/10 text-destructive mb-5 rounded-md p-3 text-sm">
          Esta conta foi desativada. Fale com a administração do studio.
        </p>
      )}
      <LoginForm next={next} />
      <div className="mt-5 text-center">
        <Link
          href="/esqueci-senha"
          className="text-primary inline-block py-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
    </AuthShell>
  );
}
