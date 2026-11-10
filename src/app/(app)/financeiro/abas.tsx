"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ABAS = [
  { href: "/financeiro", label: "Caixa", icon: Wallet, exato: true },
  { href: "/financeiro/pagar", label: "Contas a pagar", icon: ArrowUpFromLine },
  { href: "/financeiro/receber", label: "Contas a receber", icon: ArrowDownToLine },
];

export function AbasFinanceiro() {
  const pathname = usePathname();
  return (
    <nav className="bg-secondary/60 grid grid-cols-3 gap-1 rounded-xl p-1 sm:inline-grid sm:w-[34rem]">
      {ABAS.map(({ href, label, icon: Icon, exato }) => {
        const ativo = exato ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium sm:text-sm",
              ativo ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
