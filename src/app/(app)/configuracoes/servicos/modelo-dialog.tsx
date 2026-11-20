"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ehModelo, nomeGrupoModelo, nomeModelo, type Servico } from "@/lib/configuracoes";
import { salvarModelos } from "./actions";

/** Botão + janela "Serviço de modelo": marca para quais serviços existe a versão de modelo (valor a combinar). */
export function ModeloBotao({ servicos }: { servicos: Servico[] }) {
  const [aberto, setAberto] = useState(false);
  const modelos = servicos.filter((s) => ehModelo(s) && s.ativo);
  return (
    <>
      <Button variant="outline" size="lg" className="sm:h-11" onClick={() => setAberto(true)}>
        <Sparkles /> Serviço de modelo{modelos.length ? ` (${modelos.length})` : ""}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Serviço de modelo</DialogTitle>
            <DialogDescription>
              Marque os tipos de serviço que a Lilian faz em modelo (geral, sem detalhar). O valor fica <b>a combinar</b>: é definido caso a caso no
              agendamento ou ao concluir.
            </DialogDescription>
          </DialogHeader>
          {aberto && <ModeloForm servicos={servicos} onFechar={() => setAberto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

type Opcao = { nome: string; categoria: string | null };

function ModeloForm({ servicos, onFechar }: { servicos: Servico[]; onFechar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const ativos = useMemo(
    () => new Set(servicos.filter((s) => ehModelo(s) && s.ativo).map((s) => s.nome.toLowerCase())),
    [servicos]
  );
  // Grupos gerais: um por categoria com serviço pago ativo (retornos e avaliações R$ 0 não contam)
  const grupos = useMemo<Opcao[]>(() => {
    const cats = new Set(servicos.filter((s) => s.ativo && !ehModelo(s) && s.preco > 0).map((s) => s.categoria));
    return [...cats]
      .map((c) => ({ nome: nomeGrupoModelo(c), categoria: c }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [servicos]);
  // Modelos já cadastrados que não são de um grupo (digitados em "Outro")
  const [extras, setExtras] = useState<Opcao[]>(() =>
    servicos
      .filter((s) => ehModelo(s) && s.ativo)
      .map((s) => s.nome.replace(/^modelo\s+—\s*/i, ""))
      .filter((n) => !grupos.some((g) => g.nome.toLowerCase() === n.toLowerCase()))
      .map((n) => ({ nome: n, categoria: null }))
  );
  const opcoes = [...grupos, ...extras];
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(opcoes.filter((o) => ativos.has(nomeModelo(o.nome).toLowerCase())).map((o) => o.nome))
  );
  const [outro, setOutro] = useState("");

  function alternar(nome: string) {
    setMarcados((atual) => {
      const n = new Set(atual);
      if (n.has(nome)) n.delete(nome);
      else n.add(nome);
      return n;
    });
  }

  function adicionarOutro() {
    const nome = outro.trim().replace(/\s+/g, " ");
    if (!nome) return;
    if (!opcoes.some((o) => o.nome.toLowerCase() === nome.toLowerCase())) setExtras((e) => [...e, { nome, categoria: null }]);
    setMarcados((m) => new Set([...m, opcoes.find((o) => o.nome.toLowerCase() === nome.toLowerCase())?.nome ?? nome]));
    setOutro("");
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarModelos(opcoes.filter((o) => marcados.has(o.nome)));
      if (r.ok) {
        toast.success(marcados.size ? `Modelo: ${marcados.size} serviço(s)` : "Serviço de modelo desligado");
        onFechar();
      } else toast.error(r.erro);
    });
  }

  return (
    <div className="space-y-4">
      <ul className="bg-card max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
        {opcoes.map((o) => (
          <li key={o.nome}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 text-sm">
              <input
                type="checkbox"
                checked={marcados.has(o.nome)}
                onChange={() => alternar(o.nome)}
                className="accent-primary size-5"
              />
              <span className="flex-1 font-medium">{o.nome}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarOutro();
            }
          }}
          placeholder="Outro (ex.: Brow lamination)"
          aria-label="Outro serviço de modelo"
        />
        <Button type="button" variant="outline" onClick={adicionarOutro} disabled={!outro.trim()}>
          <Plus /> Incluir
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Cada um vira “Modelo — nome” na categoria Modelo, com valor a combinar. Desmarcar desativa sem apagar o
        histórico.
      </p>
      <Button size="lg" className="w-full" disabled={pendente} onClick={salvar}>
        {pendente && <Loader2 className="animate-spin" />}
        Salvar ({marcados.size})
      </Button>
    </div>
  );
}
