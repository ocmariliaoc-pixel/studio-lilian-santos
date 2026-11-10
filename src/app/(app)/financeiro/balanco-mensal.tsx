import { formatMoeda } from "@/lib/format";
import { nomeMes, type LinhaBalanco } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

/** Balanço geral de cada mês: entradas, taxas, saídas por natureza, resultado e acumulado. */
export function BalancoMensal({ linhas }: { linhas: LinhaBalanco[] }) {
  if (linhas.length === 0) return null;
  const cor = (v: number) => (v < 0 ? "text-rose-700" : v > 0 ? "text-emerald-700" : "");
  return (
    <section className="bg-card mt-5 overflow-hidden rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Balanço mês a mês</h2>
        <p className="text-muted-foreground text-xs">
          Operacional = líquido − gastos do dia a dia · Saldo = líquido − todas as saídas (inclui abertura e caução)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm tabular-nums">
          <thead className="bg-secondary/50 text-muted-foreground text-xs">
            <tr>
              {["Mês", "Entradas", "Taxas", "Líquido", "Dia a dia", "Abertura", "Caução", "Operacional", "Saldo", "Acumulado"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 font-medium", i === 0 ? "text-left" : "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.map((l) => (
              <tr key={l.mes}>
                <td className="px-3 py-2.5 font-medium capitalize">
                  {nomeMes(Number(l.mes.slice(5, 7)))}/{l.mes.slice(2, 4)}
                </td>
                <td className="px-3 py-2.5 text-right">{formatMoeda(l.entradas)}</td>
                <td className="text-muted-foreground px-3 py-2.5 text-right">−{formatMoeda(l.taxas)}</td>
                <td className="px-3 py-2.5 text-right">{formatMoeda(l.liquido)}</td>
                <td className="px-3 py-2.5 text-right">−{formatMoeda(l.diaADia)}</td>
                <td className="px-3 py-2.5 text-right">−{formatMoeda(l.abertura)}</td>
                <td className="px-3 py-2.5 text-right">−{formatMoeda(l.caucao)}</td>
                <td className={cn("px-3 py-2.5 text-right font-medium", cor(l.operacional))}>{formatMoeda(l.operacional)}</td>
                <td className={cn("px-3 py-2.5 text-right font-medium", cor(l.saldo))}>{formatMoeda(l.saldo)}</td>
                <td className={cn("px-3 py-2.5 text-right font-semibold", cor(l.acumulado))}>{formatMoeda(l.acumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
