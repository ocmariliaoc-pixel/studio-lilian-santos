"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ehModelo, formatDuracao, nomeModelo, type Servico } from "@/lib/configuracoes";
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
              Marque os serviços que a Lilian faz em modelo. O valor fica <b>a combinar</b>: é definido caso a caso no
              agendamento ou ao concluir.
            </DialogDescription>
          </DialogHeader>
          {aberto && <ModeloForm servicos={servicos} onFechar={() => setAberto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModeloForm({ servicos, onFechar }: { servicos: Servico[]; onFechar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const bases = useMemo(
    () => servicos.filter((s) => s.ativo && !ehModelo(s)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [servicos]
  );
  const ativosModelo = useMemo(
    () => new Set(servicos.filter((s) => ehModelo(s) && s.ativo).map((s) => s.nome.toLowerCase())),
    [servicos]
  );
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(bases.filter((b) => ativosModelo.has(nomeModelo(b.nome).toLowerCase())).map((b) => b.id))
  );

  const porCategoria = useMemo(() => {
    const m = new Map<string, Servico[]>();
    for (const s of bases) m.set(s.categoria, [...(m.get(s.categoria) ?? []), s]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [bases]);

  function alternar(id: string) {
    setMarcados((atual) => {
      const n = new Set(atual);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarModelos([...marcados]);
      if (r.ok) {
        toast.success(marcados.size ? `Modelo em ${marcados.size} serviço(s)` : "Serviço de modelo desligado");
        onFechar();
      } else toast.error(r.erro);
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[55vh] space-y-4 overflow-y-auto">
        {porCategoria.map(([cat, lista]) => (
          <section key={cat}>
            <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-widest uppercase">{cat}</h3>
            <ul className="bg-card divide-y rounded-lg border">
              {lista.map((s) => (
                <li key={s.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={marcados.has(s.id)}
                      onChange={() => alternar(s.id)}
                      className="accent-primary size-5"
                    />
                    <span className="flex-1">{s.nome}</span>
                    <span className="text-muted-foreground text-xs">{formatDuracao(s.duracao_min)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Cada um vira “Modelo — nome do serviço” (mesma duração e retorno), na categoria Modelo. Desmarcar desativa
        sem apagar o histórico.
      </p>
      <Button size="lg" className="w-full" disabled={pendente} onClick={salvar}>
        {pendente && <Loader2 className="animate-spin" />}
        Salvar ({marcados.size})
      </Button>
    </div>
  );
}
