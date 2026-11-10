import { formatMoeda } from "@/lib/format";
import { dataBR, grupoSaida, type Lancamento } from "@/lib/financeiro";

/*
 * Saídas por categoria: barras ordenadas (uma cor por natureza do gasto, com rótulo
 * escrito — a cor nunca aparece sozinha). Toque na categoria para ver cada gasto.
 */
const COR = { operacional: "#2a78d6", investimento: "#ad8f47", caucao: "#eb6834" } as const;
const NATUREZA = { operacional: "dia a dia", investimento: "abertura", caucao: "volta no fim do contrato" } as const;

export function CategoriasSaidas({ lancamentos }: { lancamentos: Lancamento[] }) {
  const saidas = lancamentos.filter((l) => l.tipo === "saida" && !l.cancelado);
  if (saidas.length === 0) return null;
  const total = saidas.reduce((s, l) => s + l.valor, 0);
  const grupos = new Map<string, Lancamento[]>();
  for (const l of saidas) grupos.set(l.categoria || "Outros", [...(grupos.get(l.categoria || "Outros") ?? []), l]);
  const lista = [...grupos.entries()]
    .map(([cat, itens]) => ({ cat, itens, soma: itens.reduce((s, l) => s + l.valor, 0), natureza: grupoSaida(cat) }))
    .sort((a, b) => b.soma - a.soma);
  const maior = lista[0]?.soma || 1;

  return (
    <section className="bg-card mt-5 rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Saídas por categoria</h2>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
          {(Object.keys(COR) as (keyof typeof COR)[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: COR[k] }} /> {NATUREZA[k]}
            </span>
          ))}
        </p>
      </div>
      <ul className="divide-y">
        {lista.map((g) => (
          <li key={g.cat}>
            <details className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[14rem_1fr_auto]">
                <span className="truncate text-sm">
                  <span className="text-muted-foreground mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
                  {g.cat} <span className="text-muted-foreground text-xs">{g.itens.length} {g.itens.length === 1 ? "item" : "itens"}</span>
                </span>
                <span className="order-3 col-span-2 h-2 rounded-full sm:order-none sm:col-span-1">
                  <span
                    className="block h-2 rounded-full"
                    style={{ width: `${Math.max((g.soma / maior) * 100, 2)}%`, background: COR[g.natureza] }}
                    title={`${g.cat}: ${formatMoeda(g.soma)}`}
                  />
                </span>
                <span className="text-right text-sm font-medium whitespace-nowrap tabular-nums">
                  {formatMoeda(g.soma)} <span className="text-muted-foreground text-xs">{Math.round((g.soma / total) * 100)}%</span>
                </span>
              </summary>
              <ul className="bg-secondary/30 divide-y px-4 text-sm">
                {g.itens
                  .sort((a, b) => b.valor - a.valor)
                  .map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 py-2 pl-5">
                      <span className="min-w-0 truncate">
                        {l.descricao} <span className="text-muted-foreground text-xs">· {dataBR(l.data)}</span>
                      </span>
                      <span className="tabular-nums">{formatMoeda(l.valor)}</span>
                    </li>
                  ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
