"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatMoeda } from "@/lib/format";
import { CATEGORIAS_SUGERIDAS, formatDuracao, type Servico } from "@/lib/configuracoes";
import { cn } from "@/lib/utils";
import { ServicoDialog } from "./servico-form";

export function ServicosLista({ servicos }: { servicos: Servico[] }) {
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);

  const categorias = useMemo(
    () =>
      Array.from(new Set([...servicos.map((s) => s.categoria), ...CATEGORIAS_SUGERIDAS])).sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [servicos]
  );

  const grupos = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const filtrados = servicos.filter(
      (s) =>
        (mostrarInativos || s.ativo) &&
        (!termo ||
          s.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          s.categoria.toLocaleLowerCase("pt-BR").includes(termo))
    );
    const mapa = new Map<string, Servico[]>();
    for (const s of filtrados) mapa.set(s.categoria, [...(mapa.get(s.categoria) ?? []), s]);
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [servicos, busca, mostrarInativos]);

  const inativos = servicos.filter((s) => !s.ativo).length;

  function abrir(s: Servico | null) {
    setEditando(s);
    setAberto(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviço"
            className="pl-9"
            type="search"
          />
        </div>
        <Button size="lg" onClick={() => abrir(null)} className="sm:h-11">
          <Plus />
          Novo serviço
        </Button>
      </div>

      {inativos > 0 && (
        <label className="text-muted-foreground flex items-center gap-3 text-sm">
          <Switch checked={mostrarInativos} onCheckedChange={setMostrarInativos} />
          Mostrar desativados ({inativos})
        </label>
      )}

      {servicos.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed p-8 text-center">
          <p className="font-serif text-2xl font-semibold">Nenhum serviço ainda</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Cadastre os procedimentos do studio com preço, duração e retorno.
          </p>
          <Button className="mt-5" onClick={() => abrir(null)}>
            <Plus />
            Cadastrar o primeiro
          </Button>
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Nenhum serviço encontrado.</p>
      ) : (
        grupos.map(([categoria, itens]) => (
          <section key={categoria}>
            <h2 className="text-muted-foreground mb-2 font-sans text-xs font-semibold tracking-widest uppercase">
              {categoria}
            </h2>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
              {itens.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => abrir(s)}
                    className={cn(
                      "hover:bg-secondary/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                      !s.ativo && "opacity-60"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{s.nome}</span>
                        {!s.ativo && <Badge variant="outline">Desativado</Badge>}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-sm">
                        {formatDuracao(s.duracao_min)}
                        {s.retorno_dias ? ` · retorno em ${s.retorno_dias} dias` : ""}
                      </span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">{formatMoeda(s.preco)}</span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {mostrarInativos && inativos > 0 && (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <RotateCcw className="size-3.5" />
          Para reativar, abra o serviço e ligue &ldquo;Serviço ativo&rdquo;.
        </p>
      )}

      <ServicoDialog
        open={aberto}
        onOpenChange={setAberto}
        servico={editando}
        categorias={categorias}
      />
    </div>
  );
}
