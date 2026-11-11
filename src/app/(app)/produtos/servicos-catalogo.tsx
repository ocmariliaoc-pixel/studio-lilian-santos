import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import { formatDuracao, type Servico } from "@/lib/configuracoes";
import { NovoServicoBotao } from "./novo-servico";

/** Catálogo de serviços: todas cadastram serviço novo aqui; editar preço/duração fica em Configurações → Serviços (admin). */
export function ServicosCatalogo({ servicos, admin }: { servicos: Servico[]; admin: boolean }) {
  const grupos = new Map<string, Servico[]>();
  for (const s of servicos) grupos.set(s.categoria, [...(grupos.get(s.categoria) ?? []), s]);
  const lista = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {servicos.length} serviços ativos · preço, duração e retorno sugerido.
        </p>
        <div className="flex flex-wrap gap-2">
          <NovoServicoBotao categorias={[...grupos.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"))} />
          {admin && (
            <Button asChild variant="outline">
              <Link href="/configuracoes/servicos">
                <Pencil /> Editar serviços
              </Link>
            </Button>
          )}
        </div>
      </div>
      {lista.map(([categoria, itens]) => (
        <section key={categoria}>
          <h2 className="text-muted-foreground mb-2 font-sans text-xs font-semibold tracking-widest uppercase">{categoria}</h2>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border">
            {itens.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.nome}</span>
                  <span className="text-muted-foreground block text-sm">
                    {formatDuracao(s.duracao_min)}
                    {s.retorno_dias ? ` · retorno em ${s.retorno_dias} dias` : ""}
                  </span>
                </span>
                <span className="font-semibold whitespace-nowrap tabular-nums">{formatMoeda(s.preco)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
