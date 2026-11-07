import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--secondary),transparent_60%)] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <div className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold">Bem-vinda</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            Acesse com o e-mail e a senha criados pela administração.
          </p>
          <LoginForm next={next} />
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Acesso restrito à equipe do studio. Esqueceu a senha? Fale com a Ana Jessica.
        </p>
      </div>
    </main>
  );
}
