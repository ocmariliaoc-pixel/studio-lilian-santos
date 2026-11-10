"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import type { Papel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function useAtivo() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function itensPara(papel: Papel) {
  return NAV_ITEMS.filter((i) => i.papeis.includes(papel));
}

/** Menu lateral (tablet/desktop). */
export function SidebarNav({ papel }: { papel: Papel }) {
  const ativo = useAtivo();
  return (
    <nav className="flex flex-col gap-1">
      {itensPara(papel).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-10 items-center gap-3 rounded-md border-l-2 px-3 text-sm font-medium transition-colors",
            ativo(href)
              ? "border-gold bg-white/[0.07] text-white"
              : "text-sidebar-foreground/65 border-transparent hover:bg-white/5 hover:text-white"
          )}
        >
          <Icon className={cn("size-[18px]", ativo(href) && "text-gold")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior (celular): itens principais + "Mais". */
export function BottomNav({ papel }: { papel: Papel }) {
  const ativo = useAtivo();
  const itens = itensPara(papel);
  const principais = itens.filter((i) => i.mobile);
  const extras = itens.filter((i) => !i.mobile);

  const classe = (on: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
      on ? "text-gold-dark" : "text-muted-foreground"
    );

  return (
    <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-16 items-stretch">
        {principais.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={classe(ativo(href))}>
            <Icon className="size-6" strokeWidth={ativo(href) ? 2.25 : 1.75} />
            {label}
          </Link>
        ))}
        {extras.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className={classe(extras.some((i) => ativo(i.href)))}>
              <MoreHorizontal className="size-6" strokeWidth={1.75} />
              Mais
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-2 w-52">
              {extras.map((item: NavItem) => (
                <DropdownMenuItem key={item.href} asChild className="h-11 text-base">
                  <Link href={item.href}>
                    <item.icon className="size-5" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
