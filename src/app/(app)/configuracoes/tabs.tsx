"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, CreditCard, Sparkles, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ABAS = [
  { href: "/configuracoes/servicos", label: "Serviços", icon: Sparkles },
  { href: "/configuracoes/horarios", label: "Horários", icon: Clock },
  { href: "/configuracoes/taxas", label: "Taxas", icon: CreditCard },
  { href: "/configuracoes/usuarias", label: "Usuárias", icon: UsersRound },
];

export function ConfigTabs() {
  const pathname = usePathname();
  return (
    <nav>
      <div className="bg-secondary/60 grid grid-cols-4 gap-1 rounded-xl p-1 sm:inline-flex">
        {ABAS.map(({ href, label, icon: Icon }) => {
          const ativo = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium whitespace-nowrap transition-colors sm:h-10 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
                ativo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
