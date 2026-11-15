import Link from "next/link";
import { FileUp, ListTodo } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoeda } from "@/lib/format";
import { dataLocal } from "@/lib/agenda";
import { ehRepasseCartao } from "@/lib/extrato-ton";
import { situacaoExtrato, textoPrazo } from "@/lib/extrato-alerta";
import { cn } from "@/lib/utils";

/**
 * Início (admin): lembrete de subir o extrato da Ton nos dias 15 e 30 e a lista de pendências
 * que a análise do extrato encontrou (entradas do banco que não estão no caixa).
 */
export async function AlertaExtrato({ hoje }: { hoje: string }) {
  const supabase = await createClient();
  const [ultimo, movs] = await Promise.all([
    supabase.from("extrato_movimentos").select("importado_em, data").order("importado_em", { ascending: false }).limit(1),
    supabase
      .from("extrato_movimentos")
      .select("data, descricao, meio, valor")
      .eq("tipo", "entrada")
      .eq("ignorado", false)
      .is("lancamento_id", null)
      .order("data", { ascending: false }),
  ]);
  if (ultimo.error) return null; // migração 0012 não rodada
  const { data: maisRecente } = await supabase
    .from("extrato_movimentos")
    .select("data")
    .order("data", { ascending: false })
    .limit(1);

  const envio = ultimo.data?.[0]?.importado_em ? dataLocal(ultimo.data[0].importado_em) : null;
  const s = situacaoExtrato(hoje, envio, maisRecente?.[0]?.data ?? null);
  const pendencias = (movs.data ?? []).filter((m) => !ehRepasseCartao({ descricao: m.descricao, meio: m.meio }));
  const totalPend = pendencias.reduce((t, m) => t + Number(m.valor), 0);

  if (!s.subir && pendencias.length === 0) return null;

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border p-4",
        s.subir && s.atrasoDias > 0 ? "border-rose-300 bg-rose-50 text-rose-950" : "border-amber-300 bg-amber-50 text-amber-950"
      )}
    >
      {s.subir && (
        <div className="flex items-center gap-3">
          <FileUp className="size-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Subir o extrato da Ton</span>
            <span className="block text-sm opacity-80">
              {textoPrazo(s)} · todo dia 15 e 30, para conferir o caixa com o banco
            </span>
          </span>
          <Link
            href="/financeiro/receber"
            className="bg-primary text-primary-foreground shrink-0 rounded-lg px-3 py-2 text-sm font-semibold"
          >
            Subir agora
          </Link>
        </div>
      )}

      {pendencias.length > 0 && (
        <div className={cn("space-y-2", s.subir && "border-t border-current/15 pt-3")}>
          <div className="flex items-center gap-3">
            <ListTodo className="size-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {pendencias.length} {pendencias.length === 1 ? "pendência" : "pendências"} do extrato ·{" "}
                {formatMoeda(totalPend)}
              </span>
              <span className="block text-sm opacity-80">Entraram no banco e não estão no caixa</span>
            </span>
            <Link
              href="/financeiro/receber?ext=faltam"
              className="bg-card shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Resolver
            </Link>
          </div>
          <ul className="space-y-1 pl-9 text-sm">
            {pendencias.slice(0, 4).map((m, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">
                  {m.data.split("-").reverse().slice(0, 2).join("/")} · {m.descricao}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{formatMoeda(Number(m.valor))}</span>
              </li>
            ))}
            {pendencias.length > 4 && <li className="opacity-70">+ {pendencias.length - 4} no Financeiro › Contas a receber</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
