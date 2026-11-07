"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronRight, ClipboardCheck, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoeda } from "@/lib/format";
import { numeroParaCampo } from "@/lib/configuracoes";
import { CATEGORIAS_PRODUTO, formatDias, type Produto } from "@/lib/produtos";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { registrarInventario, salvarProduto } from "./actions";

function agrupar(produtos: Produto[]) {
  const mapa = new Map<string, Produto[]>();
  for (const p of produtos) mapa.set(p.categoria, [...(mapa.get(p.categoria) ?? []), p]);
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

function EstoqueBadge({ n }: { n: number }) {
  if (n <= 0)
    return <Badge variant="destructive">{n < 0 ? `${n} (conferir)` : "Esgotado"}</Badge>;
  if (n === 1) return <Badge className="bg-amber-100 text-amber-900">1 un. · acabando</Badge>;
  return <Badge variant="secondary">{n} un.</Badge>;
}

export function ProdutosTela({
  produtos,
  admin,
  iniciarInventario,
}: {
  produtos: Produto[];
  admin: boolean;
  iniciarInventario: boolean;
}) {
  const [modoInventario, setModoInventario] = useState(iniciarInventario);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [aberto, setAberto] = useState(false);

  const ativos = produtos.filter((p) => p.ativo);
  const inativos = produtos.filter((p) => !p.ativo);
  const comEstoque = ativos.filter((p) => p.controla_estoque);

  if (modoInventario) {
    return <Inventario produtos={comEstoque} onSair={() => setModoInventario(false)} />;
  }

  function abrir(p: Produto | null) {
    setEditando(p);
    setAberto(true);
  }

  const totalUnidades = comEstoque.reduce((s, p) => s + Math.max(p.estoque, 0), 0);
  const valorEstoque = comEstoque.reduce((s, p) => s + Math.max(p.estoque, 0) * p.preco, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => setModoInventario(true)} className="sm:flex-1">
          <ClipboardCheck />
          Fazer inventário
        </Button>
        {admin && (
          <Button size="lg" variant="outline" onClick={() => abrir(null)}>
            <Plus />
            Novo produto
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        {totalUnidades} unidades em estoque · {formatMoeda(valorEstoque)} a preço de venda
      </p>

      {agrupar(ativos).map(([categoria, itens]) => (
        <section key={categoria}>
          <h2 className="text-muted-foreground mb-2 font-sans text-xs font-semibold tracking-widest uppercase">
            {categoria}
          </h2>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border">
            {itens.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!admin}
                  onClick={() => abrir(p)}
                  className="hover:bg-secondary/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors disabled:hover:bg-transparent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.nome}</span>
                    <span className="text-muted-foreground text-sm">{formatMoeda(p.preco)}</span>
                  </span>
                  {p.controla_estoque ? (
                    <EstoqueBadge n={p.estoque} />
                  ) : (
                    <Badge variant="outline">
                      {p.duracao_dias
                        ? formatDias(p.duracao_dias)
                        : p.categoria === "Cursos"
                          ? "conforme agenda"
                          : "sem controle"}
                    </Badge>
                  )}
                  {admin && <ChevronRight className="text-muted-foreground size-4 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {ativos.length === 0 && (
        <p className="text-muted-foreground bg-card rounded-xl border border-dashed p-8 text-center text-sm">
          Nenhum produto cadastrado.
        </p>
      )}

      {admin && inativos.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer py-2">
            Produtos desativados ({inativos.length})
          </summary>
          <ul className="bg-card mt-2 divide-y rounded-xl border opacity-70">
            {inativos.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => abrir(p)} className="w-full px-4 py-3 text-left">
                  {p.nome}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>Preço de venda e quantidade em estoque.</DialogDescription>
          </DialogHeader>
          <ProdutoForm
            key={editando?.id ?? "novo"}
            produto={editando}
            categorias={[...new Set([...produtos.map((p) => p.categoria), ...CATEGORIAS_PRODUTO])]}
            onSalvo={() => setAberto(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProdutoForm({
  produto,
  categorias,
  onSalvo,
}: {
  produto: Produto | null;
  categorias: string[];
  onSalvo: () => void;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarProduto, {});
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [controla, setControla] = useState(produto?.controla_estoque ?? true);

  useEffect(() => {
    if (state.ok) {
      toast.success(produto ? "Produto atualizado" : "Produto cadastrado");
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  return (
    <form action={action} className="space-y-4">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={produto?.nome} autoComplete="off" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Input
          id="categoria"
          name="categoria"
          list="categorias-produto"
          defaultValue={produto?.categoria}
          autoComplete="off"
        />
        <datalist id="categorias-produto">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="preco">Preço</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              R$
            </span>
            <Input
              id="preco"
              name="preco"
              inputMode="decimal"
              defaultValue={numeroParaCampo(produto?.preco)}
              className="pl-9"
              required
            />
          </div>
        </div>
        {controla && (
          <div className="space-y-2">
            <Label htmlFor="estoque">Estoque</Label>
            <Input
              id="estoque"
              name="estoque"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={Math.max(produto?.estoque ?? 0, 0)}
              required
            />
          </div>
        )}
      </div>
      <label className="bg-secondary/50 flex items-center justify-between gap-3 rounded-lg p-3">
        <span>
          <span className="block text-sm font-medium">Controlar estoque</span>
          <span className="text-muted-foreground block text-xs">
            Desligue para cursos, e-book e voucher.
          </span>
        </span>
        <Switch checked={controla} onCheckedChange={setControla} />
        {controla && <input type="hidden" name="controla_estoque" value="on" />}
      </label>
      {!controla && (
        <div className="space-y-2">
          <Label htmlFor="duracao_dias">Duração (cursos)</Label>
          <div className="relative">
            <Input
              id="duracao_dias"
              name="duracao_dias"
              inputMode="decimal"
              defaultValue={produto?.duracao_dias ? numeroParaCampo(produto.duracao_dias, 1) : ""}
              placeholder="Ex.: 2 ou 0,5"
              className="pr-14"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              dias
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Use 0,5 para meio período. Na agenda, a turma vai bloquear esses dias.
          </p>
        </div>
      )}
      <label className="bg-secondary/50 flex items-center justify-between gap-3 rounded-lg p-3">
        <span className="text-sm font-medium">Produto ativo (aparece no caixa)</span>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
        {ativo && <input type="hidden" name="ativo" value="on" />}
      </label>
      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function Inventario({ produtos, onSair }: { produtos: Produto[]; onSair: () => void }) {
  const [contagem, setContagem] = useState<Record<string, number>>(() =>
    Object.fromEntries(produtos.map((p) => [p.id, Math.max(p.estoque, 0)]))
  );
  const [salvando, iniciar] = useTransition();
  const diferencas = useMemo(
    () => produtos.filter((p) => contagem[p.id] !== p.estoque).length,
    [produtos, contagem]
  );

  function mudar(id: string, delta: number) {
    setContagem((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  }

  function salvar() {
    iniciar(async () => {
      const r = await registrarInventario(
        produtos.map((p) => ({ produto_id: p.id, contado: contagem[p.id] ?? 0 }))
      );
      if (r.ok) {
        toast.success(
          diferencas === 0
            ? "Inventário registrado: tudo confere"
            : `Inventário registrado: ${diferencas} ${diferencas === 1 ? "produto ajustado" : "produtos ajustados"}`
        );
        onSair();
      } else toast.error(r.erro);
    });
  }

  return (
    <div className="space-y-5">
      <div className="bg-secondary/60 rounded-xl p-4 text-sm">
        <p className="font-medium">Conte cada produto na prateleira.</p>
        <p className="text-muted-foreground mt-1">
          Ajuste com − e + quando a quantidade for diferente do sistema. Ao salvar, o estoque fica
          igual à contagem.
        </p>
      </div>

      {agrupar(produtos).map(([categoria, itens]) => (
        <section key={categoria}>
          <h2 className="text-muted-foreground mb-2 font-sans text-xs font-semibold tracking-widest uppercase">
            {categoria}
          </h2>
          <ul className="bg-card divide-y overflow-hidden rounded-xl border">
            {itens.map((p) => {
              const n = contagem[p.id] ?? 0;
              const difere = n !== p.estoque;
              return (
                <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", difere && "bg-amber-50")}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.nome}</span>
                    <span className="text-muted-foreground text-xs">
                      sistema: {p.estoque}
                      {difere && (
                        <strong className="text-amber-800">
                          {" "}
                          · {n - p.estoque > 0 ? "+" : ""}
                          {n - p.estoque}
                        </strong>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" aria-label={`Menos ${p.nome}`} onClick={() => mudar(p.id, -1)}>
                      <Minus />
                    </Button>
                    <span className="w-9 text-center text-lg font-semibold tabular-nums">{n}</span>
                    <Button type="button" variant="outline" size="icon" aria-label={`Mais ${p.nome}`} onClick={() => mudar(p.id, 1)}>
                      <Plus />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 border-t px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-xl md:border">
        <Button variant="ghost" size="lg" onClick={onSair} disabled={salvando}>
          Voltar
        </Button>
        <Button size="lg" className="flex-1" onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          Salvar inventário{diferencas > 0 ? ` (${diferencas} ajuste${diferencas > 1 ? "s" : ""})` : ""}
        </Button>
      </div>
    </div>
  );
}
