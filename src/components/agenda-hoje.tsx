import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { descricaoItens, hhmmDeMinutos, minutosLocal, OFFSET, somarDias, STATUS, type StatusAgendamento } from "@/lib/agenda";
import { cn } from "@/lib/utils";

/** Início: atendimentos de hoje; tocar abre o atendimento na agenda para mudar o status. */
export async function AgendaHoje({ hoje }: { hoje: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, inicio, status, cliente:clientes(nome), itens:agendamento_itens(nome, ordem)")
    .gte("inicio", `${hoje}T00:00:00${OFFSET}`)
    .lt("inicio", `${somarDias(hoje, 1)}T00:00:00${OFFSET}`)
    .neq("status", "cancelado")
    .order("inicio");
  if (error) return null;
  const lista = data ?? [];

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="text-gold-dark size-4" /> Agenda de hoje ({lista.length})
        </h2>
        <Link href="/agenda" className="text-muted-foreground text-xs underline">
          abrir agenda
        </Link>
      </div>
      {lista.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum atendimento marcado para hoje.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((a) => {
            const st = STATUS[a.status as StatusAgendamento];
            const itens = ((a.itens ?? []) as { nome: string; ordem: number }[]).sort((x, y) => x.ordem - y.ordem);
            return (
              <li key={a.id}>
                <Link
                  href={`/agenda?v=dia&d=${hoje}&a=${a.id}`}
                  className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", st.classe)}
                >
                  <span className="w-12 font-semibold tabular-nums">{hhmmDeMinutos(minutosLocal(a.inicio))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{(a.cliente as unknown as { nome: string } | null)?.nome}</span>
                    <span className="block truncate text-xs opacity-80">{descricaoItens(itens)}</span>
                  </span>
                  <span className="text-[11px] font-semibold uppercase">{st.rotulo}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
