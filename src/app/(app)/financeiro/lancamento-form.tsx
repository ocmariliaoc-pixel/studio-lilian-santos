"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, RotateCcw, Ban, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoData } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CampoCliente } from "@/components/campo-cliente";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoeda } from "@/lib/format";
import {
  FORMAS_PAGAMENTO,
  numeroParaCampo,
  parseNumeroBR,
  valorLiquido,
  type FormaPagamento,
  type TaxaPagamento,
} from "@/lib/configuracoes";
import {
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  type Lancamento,
  type TipoLancamento,
} from "@/lib/financeiro";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { alternarCancelamento, salvarLancamento } from "./actions";
import { semResetar } from "@/lib/form";

export type ProdutoCaixa = {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  controla_estoque: boolean;
};

export type ServicoCaixa = { nome: string; preco: number };

export type DadosFormulario = {
  taxas: TaxaPagamento[];
  sugestoes: string[];
  /** Serviços ativos com o preço da tabela (escolher no caixa preenche descrição e valor) */
  servicos?: ServicoCaixa[];
  produtos: ProdutoCaixa[];
  clientes: string[];
  hoje: string;
};

export function LancamentoDialog({
  open,
  onOpenChange,
  lancamento,
  podeEditar,
  dados,
  tipoInicial = "entrada",
}: {
  tipoInicial?: TipoLancamento;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lancamento: Lancamento | null;
  podeEditar: boolean;
  dados: DadosFormulario;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lancamento ? "Lançamento" : tipoInicial === "saida" ? "Lançar despesa" : "Registrar venda"}
          </DialogTitle>
          <DialogDescription>
            {lancamento
              ? lancamento.autora
                ? `Lançado por ${lancamento.autora}.`
                : "Detalhes do lançamento."
              : "Registre uma entrada ou saída de dinheiro."}
          </DialogDescription>
        </DialogHeader>
        <LancamentoForm
          key={lancamento?.id ?? `novo-${tipoInicial}`}
          lancamento={lancamento}
          tipoInicial={tipoInicial}
          podeEditar={podeEditar}
          dados={dados}
          onFechar={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LancamentoForm({
  tipoInicial,
  lancamento,
  podeEditar,
  dados,
  onFechar,
}: {
  tipoInicial: TipoLancamento;
  lancamento: Lancamento | null;
  podeEditar: boolean;
  dados: DadosFormulario;
  onFechar: () => void;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarLancamento, {});
  const [cancelando, iniciarCancelamento] = useTransition();
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? tipoInicial);
  const [valorTexto, setValorTexto] = useState(numeroParaCampo(lancamento?.valor));
  const [forma, setForma] = useState<FormaPagamento | "">(lancamento?.forma_pagamento ?? "");
  const [parcelas, setParcelas] = useState(lancamento?.parcelas && lancamento.parcelas > 1 ? lancamento.parcelas : 2);
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? (tipo === "entrada" ? "Serviço" : "Outros"));
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? "");
  const [produtoId, setProdutoId] = useState(lancamento?.produto_id ?? "");
  const [quantidade, setQuantidade] = useState(lancamento?.quantidade ?? 1);
  const [servicosEscolhidos, setServicosEscolhidos] = useState<string[]>([]);
  // Valor vem da tabela; "Valor diferenciado" libera para digitar (desconto, cortesia, preço combinado).
  const [valorDiferenciado, setValorDiferenciado] = useState(!!lancamento);
  const bloqueado = !podeEditar || lancamento?.cancelado;

  useEffect(() => {
    if (state.ok) {
      toast.success(lancamento ? "Lançamento atualizado" : "Lançamento registrado");
      onFechar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  const ativas = dados.taxas.filter((t) => t.ativo);
  const formasAtivas = (Object.keys(FORMAS_PAGAMENTO) as FormaPagamento[]).filter((f) =>
    ativas.some((t) => t.forma === f)
  );
  const parcelasAtivas = ativas
    .filter((t) => t.forma === "credito_parcelado")
    .map((t) => t.parcelas)
    .sort((a, b) => a - b);

  const valor = parseNumeroBR(valorTexto) ?? 0;
  const ehBrinde = tipo === "entrada" && valor === 0 && valorTexto.trim() !== "";
  const taxa =
    forma === ""
      ? 0
      : (ativas.find(
          (t) => t.forma === forma && t.parcelas === (forma === "credito_parcelado" ? parcelas : 1)
        )?.taxa_percentual ?? 0);

  const vendeCurso = tipo === "entrada" && categoria === "Curso";
  const vendeProduto = tipo === "entrada" && (categoria === "Produto" || vendeCurso);
  const opcoesProduto = dados.produtos.filter((p) =>
    vendeCurso ? p.categoria === "Cursos" : p.categoria !== "Cursos"
  );
  const produtoEscolhido = opcoesProduto.find((p) => p.id === produtoId);
  const vendeServico = tipo === "entrada" && categoria === "Serviço";
  const tabelaServicos = dados.servicos ?? [];
  const precoServicos = (nomes: string[]) =>
    nomes.reduce((t, n) => t + (tabelaServicos.find((x) => x.nome === n)?.preco ?? 0), 0);
  // Preço de tabela do que foi escolhido (produto × quantidade ou soma dos serviços)
  const valorTabela = vendeProduto
    ? produtoEscolhido
      ? produtoEscolhido.preco * quantidade
      : null
    : vendeServico && servicosEscolhidos.length > 0
      ? precoServicos(servicosEscolhidos)
      : null;
  const valorTravado = valorTabela != null && !valorDiferenciado;
  // Repasse da taxa: a cliente paga o juro da maquininha e o studio recebe o preço cheio.
  const base = valorTabela ?? 0;
  const valorComRepasse = taxa > 0 && base > 0 ? Math.ceil((base / (1 - taxa / 100)) * 100) / 100 : 0;
  const repassando = valorComRepasse > 0 && Math.abs(valor - valorComRepasse) < 0.005;

  function escolherProduto(id: string, qtd = quantidade) {
    setProdutoId(id);
    const p = dados.produtos.find((x) => x.id === id);
    if (!p) return;
    setDescricao(qtd > 1 ? `${qtd}x ${p.nome}` : p.nome);
    if (!valorDiferenciado) setValorTexto(numeroParaCampo(p.preco * qtd));
  }

  function mudarServicos(nomes: string[]) {
    setServicosEscolhidos(nomes);
    setDescricao(nomes.join(" + "));
    if (!valorDiferenciado || nomes.length === 0) setValorTexto(nomes.length ? numeroParaCampo(precoServicos(nomes)) : "");
  }

  function alternarDiferenciado(marcado: boolean) {
    setValorDiferenciado(marcado);
    if (!marcado && valorTabela != null) setValorTexto(numeroParaCampo(valorTabela));
  }

  function mudarQuantidade(qtd: number) {
    const q = Math.max(1, qtd);
    setQuantidade(q);
    if (produtoId) escolherProduto(produtoId, q);
  }

  function trocarTipo(t: TipoLancamento) {
    setTipo(t);
    setCategoria(t === "entrada" ? "Serviço" : "Outros");
    setServicosEscolhidos([]);
    setProdutoId("");
  }

  function cancelar(valorCancelado: boolean) {
    if (!lancamento) return;
    iniciarCancelamento(async () => {
      const r = await alternarCancelamento(lancamento.id, valorCancelado);
      if (r.ok) {
        toast.success(valorCancelado ? "Lançamento cancelado" : "Lançamento reativado");
        onFechar();
      } else toast.error(r.erro);
    });
  }

  return (
    <form onSubmit={semResetar(action)} className="space-y-4">
      {lancamento && <input type="hidden" name="id" value={lancamento.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="forma_pagamento" value={tipo === "entrada" ? forma : ""} />
      <input type="hidden" name="parcelas" value={forma === "credito_parcelado" ? parcelas : 1} />
      <input type="hidden" name="produto_id" value={vendeProduto ? produtoId : ""} />
      <input type="hidden" name="quantidade" value={vendeProduto ? quantidade : 1} />

      <fieldset disabled={bloqueado} className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["entrada", "saida"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => trocarTipo(t)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                tipo === t
                  ? t === "entrada"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-rose-600 bg-rose-50 text-rose-800"
                  : "text-muted-foreground bg-card"
              )}
            >
              {t === "entrada" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              {t === "entrada" ? "Entrada" : "Saída"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <NativeSelect
            id="categoria"
            name="categoria"
            value={ehBrinde ? "Brinde" : categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            {(tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
        {vendeProduto && (
          <div className="bg-secondary/40 space-y-3 rounded-lg p-3">
            <div className="space-y-2">
              <Label htmlFor="produto">{vendeCurso ? "Curso vendido" : "Produto vendido"}</Label>
              <NativeSelect
                id="produto"
                value={produtoId}
                onChange={(e) => escolherProduto(e.target.value)}
              >
                <option value="">{vendeCurso ? "Escolha o curso…" : "Escolha o produto…"}</option>
                {opcoesProduto.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {formatMoeda(p.preco)}
                    {p.controla_estoque ? ` · ${p.estoque} em estoque` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className={cn("flex items-center justify-between gap-3", vendeCurso && "hidden")}>
              <span className="text-sm font-medium">Quantidade</span>
              <span className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" aria-label="Menos" onClick={() => mudarQuantidade(quantidade - 1)}>
                  −
                </Button>
                <span className="w-9 text-center text-lg font-semibold tabular-nums">{quantidade}</span>
                <Button type="button" variant="outline" size="icon" aria-label="Mais" onClick={() => mudarQuantidade(quantidade + 1)}>
                  +
                </Button>
              </span>
            </div>
            {produtoEscolhido?.controla_estoque && produtoEscolhido.estoque - quantidade < 0 && !lancamento && (
              <p className="text-sm text-amber-800">
                O sistema tem só {produtoEscolhido.estoque} em estoque. Dá para registrar mesmo
                assim; confira no próximo inventário.
              </p>
            )}
            {produtoEscolhido?.controla_estoque && (
              <p className="text-muted-foreground text-xs">O estoque é baixado ao registrar.</p>
            )}
          </div>
        )}
        {vendeServico && !lancamento && tabelaServicos.length > 0 && (
          <div className="bg-secondary/40 space-y-3 rounded-lg p-3">
            <div className="space-y-2">
              <Label htmlFor="servico">Serviços feitos</Label>
              <NativeSelect
                id="servico"
                value=""
                onChange={(e) => e.target.value && mudarServicos([...servicosEscolhidos, e.target.value])}
              >
                <option value="">{servicosEscolhidos.length ? "Adicionar outro serviço…" : "Escolha o serviço…"}</option>
                {tabelaServicos.map((s) => (
                  <option key={s.nome} value={s.nome}>
                    {s.nome} · {formatMoeda(s.preco)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {servicosEscolhidos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {servicosEscolhidos.map((n, i) => (
                  <li key={`${n}-${i}`}>
                    <button
                      type="button"
                      onClick={() => mudarServicos(servicosEscolhidos.filter((_, j) => j !== i))}
                      className="bg-card inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm"
                      aria-label={`Tirar ${n}`}
                    >
                      {n}
                      <X className="text-muted-foreground size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                R$
              </span>
              <Input
                id="valor"
                name="valor"
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                readOnly={valorTravado}
                placeholder="0,00"
                className={cn("h-12 pl-9 text-lg font-semibold", valorTravado && "bg-secondary/60")}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <div className="w-40">
              <CampoData id="data" name="data" defaultValue={lancamento?.data ?? dados.hoje} className="h-12" required />
            </div>
          </div>
        </div>
        {valorTabela != null && (
          <label className="-mt-2 flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={valorDiferenciado}
              onChange={(e) => alternarDiferenciado(e.target.checked)}
              className="accent-primary size-5"
            />
            <span>
              Valor diferenciado
              <span className="text-muted-foreground"> · tabela {formatMoeda(valorTabela)}</span>
            </span>
          </label>
        )}

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input
            id="descricao"
            name="descricao"
            list="sugestoes-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === "entrada" ? "Ex.: Design + buço" : "Ex.: Compra de henna"}
            autoComplete="off"
            required
          />
          <datalist id="sugestoes-descricao">
            {dados.sugestoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {tipo === "entrada" && (
          <div className="space-y-2">
            <Label htmlFor="cliente_nome">Cliente</Label>
            <CampoCliente
              clientes={dados.clientes}
              defaultValue={lancamento?.cliente_nome ?? ""}
              parecidasServidor={state.parecidas}
              placeholder="Nome da cliente (opcional)"
            />
          </div>
        )}

        {tipo === "entrada" && !ehBrinde && (
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {formasAtivas.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  className={cn(
                    "h-11 rounded-lg border px-2 text-sm font-medium transition-colors",
                    forma === f ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  {f === "credito_parcelado" ? "Parcelado" : FORMAS_PAGAMENTO[f]}
                </button>
              ))}
            </div>
            {forma === "credito_parcelado" && parcelasAtivas.length > 0 && (
              <NativeSelect
                aria-label="Parcelas"
                value={String(parcelas)}
                onChange={(e) => setParcelas(Number(e.target.value))}
              >
                {parcelasAtivas.map((p) => (
                  <option key={p} value={p}>
                    {p}x
                  </option>
                ))}
              </NativeSelect>
            )}
            {forma !== "" && valor > 0 && (
              <p className="bg-secondary/60 rounded-md px-3 py-2 text-sm">
                Taxa {numeroParaCampo(taxa)}% · entra{" "}
                <strong>{formatMoeda(valorLiquido(valor, taxa))}</strong>
              </p>
            )}
            {valorComRepasse > 0 && !repassando && (
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full py-2 whitespace-normal"
                onClick={() => setValorTexto(numeroParaCampo(valorComRepasse))}
              >
                Repassar a taxa para a cliente: cobrar {formatMoeda(valorComRepasse)}
              </Button>
            )}
            {repassando && (
              <p className="text-sm text-emerald-800">
                Taxa repassada: a cliente paga {formatMoeda(valorComRepasse)} e o studio recebe{" "}
                {formatMoeda(base)}.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setValorTexto(numeroParaCampo(base))}
                >
                  Desfazer
                </button>
              </p>
            )}
          </div>
        )}

        {ehBrinde && (
          <p className="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm">
            Valor zero: registrado como <strong>brinde</strong> (conta como atendimento, não como
            faturamento).
          </p>
        )}

      </fieldset>

      {lancamento?.cancelado && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          Este lançamento está cancelado e não entra nos totais.
        </p>
      )}
      {!podeEditar && (
        <p className="text-muted-foreground text-sm">
          Só quem lançou (ou a administração) pode corrigir este lançamento.
        </p>
      )}

      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}

      {podeEditar && (
        <DialogFooter>
          {lancamento && (
            <Button
              type="button"
              variant="ghost"
              className={lancamento.cancelado ? "" : "text-destructive"}
              disabled={cancelando}
              onClick={() => cancelar(!lancamento.cancelado)}
            >
              {lancamento.cancelado ? <RotateCcw /> : <Ban />}
              {lancamento.cancelado ? "Reativar" : "Cancelar lançamento"}
            </Button>
          )}
          {!lancamento?.cancelado && (
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {lancamento ? "Salvar correção" : "Registrar"}
            </Button>
          )}
        </DialogFooter>
      )}
    </form>
  );
}
