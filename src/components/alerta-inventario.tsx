import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { textoPrazoInventario, type StatusInventario } from "@/lib/produtos";
import { cn } from "@/lib/utils";

/** Aviso do inventário quinzenal. `sempre` mostra mesmo quando ainda não venceu. */
export function AlertaInventario({
  status,
  sempre = false,
}: {
  status: StatusInventario | null;
  sempre?: boolean;
}) {
  if (!status || (!status.pendente && !sempre)) return null;
  const atrasado = status.diasRestantes < 0;

  return (
    <Link
      href="/produtos?inventario=1"
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 transition-colors",
        status.pendente
          ? atrasado
            ? "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
            : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : "bg-card text-foreground hover:bg-secondary/40"
      )}
    >
      <ClipboardList className="size-6 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {status.pendente ? "Hora do inventário do estoque" : "Inventário do estoque"}
        </span>
        <span className="block text-sm opacity-80">
          A cada {status.intervalo} dias · {textoPrazoInventario(status)}
        </span>
      </span>
      {status.pendente && <span className="text-sm font-semibold whitespace-nowrap">Fazer agora →</span>}
    </Link>
  );
}
