import { Logo } from "@/components/logo";

/** Moldura das telas sem login (entrar, esqueci a senha, nova senha). */
export function AuthShell({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--secondary),transparent_60%)] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo variante="completa" className="w-56" />
        </div>
        <div className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-semibold">{titulo}</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">{descricao}</p>
          {children}
        </div>
        {rodape && <div className="text-muted-foreground mt-6 text-center text-sm">{rodape}</div>}
      </div>
    </main>
  );
}
