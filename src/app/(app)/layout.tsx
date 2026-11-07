import Link from "next/link";
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfil();
  if (!perfil.ativo) redirect("/auth/inativa");

  return (
    <div className="min-h-dvh md:flex">
      {/* Menu lateral (md+) */}
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/" className="mb-8 px-2 pt-2">
          <Logo />
        </Link>
        <SidebarNav papel={perfil.papel} />
        <div className="mt-auto border-t pt-3">
          <UserMenu perfil={perfil} showName />
        </div>
      </aside>

      {/* Cabeçalho (celular) */}
      <header className="bg-background/90 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <div className="w-auto">
          <UserMenu perfil={perfil} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-10 md:py-10">
        {children}
      </main>

      <BottomNav papel={perfil.papel} />
    </div>
  );
}
