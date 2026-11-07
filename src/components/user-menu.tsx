"use client";

import { LogOut } from "lucide-react";
import type { Perfil } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAPEL_LABEL = { admin: "Administradora", profissional: "Profissional" } as const;

export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ perfil, showName = false }: { perfil: Perfil; showName?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-secondary flex w-full items-center gap-3 rounded-lg p-1.5 text-left outline-none">
        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {iniciais(perfil.nome)}
        </span>
        {showName && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-medium">{perfil.nome}</span>
            <span className="text-muted-foreground block text-xs">{PAPEL_LABEL[perfil.papel]}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate">{perfil.nome}</span>
          <span className="text-muted-foreground block truncate text-xs font-normal">
            {perfil.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action="/auth/sair" method="post">
          <DropdownMenuItem asChild variant="destructive" className="h-11 w-full">
            <button type="submit">
              <LogOut />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
