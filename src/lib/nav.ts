import {
  CalendarDays,
  Home,
  ListChecks,
  Package,
  Settings,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Papel } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Perfis que veem o item. Profissional vê financeiro/metas em modo leitura. */
  papeis: Papel[];
  /** Aparece na barra inferior do celular. */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home, papeis: ["admin", "profissional"], mobile: true },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, papeis: ["admin", "profissional"], mobile: true },
  { href: "/clientes", label: "Clientes", icon: Users, papeis: ["admin", "profissional"], mobile: true },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, papeis: ["admin", "profissional"], mobile: true },
  { href: "/checklist", label: "Checklist", icon: ListChecks, papeis: ["admin", "profissional"] },
  { href: "/produtos", label: "Produtos e serviços", icon: Package, papeis: ["admin", "profissional"] },
  { href: "/metas", label: "Metas", icon: Target, papeis: ["admin", "profissional"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, papeis: ["admin"] },
];

export function navPara(papel: Papel) {
  return NAV_ITEMS.filter((i) => i.papeis.includes(papel));
}
