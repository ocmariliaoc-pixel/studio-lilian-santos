"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoeda } from "@/lib/format";
import { dataBR } from "@/lib/financeiro";
import { parecenca } from "@/lib/nomes";
import type { ClienteResumo } from "@/lib/clientes";
import { cn } from "@/lib/utils";
import { juntarClientes } from "./actions";

/** Pares de cadastros com nome muito parecido (provavelmente a mesma pessoa). */
function acharRepetidos(clientes: ClienteResumo[]) {
  const pares: [ClienteResumo, ClienteResumo][] = [];
  for (let i = 0; i < clientes.length; i++)
    for (let j = i + 1; j < clientes.length; j++) {
      const a = clientes[i];
      const b = clientes[j];
      const mesmoTel = !!a.whatsapp && a.whatsapp === b.whatsapp;
      if (mesmoTel || parecenca(a.nome, b.nome) >= 2) pares.push([a, b]);
    }
  return pares;
}

export function CadastrosRepetidos({ clientes }: { clientes: ClienteResumo[] }) {
  const pares = useMemo(() => acharRepetidos(clientes), [clientes]);
  const [par, setPar] = useState<[ClienteResumo, ClienteResumo] | null>(null);
  // "São pessoas diferentes" fica lembrado neste aparelho
  const [ignorados, setIgnorados] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIgnorados(JSON.parse(localStorage.getItem("clientes-diferentes") ?? "[]"));
    } catch {}
  }, []);
  function ignorar(chave: string) {
    const novos = [...ignorados, chave];
    setIgnorados(novos);
    try {
      localStorage.setItem("clientes-diferentes", JSON.stringify(novos));
    } catch {}
  }
  const visiveis = pares.filter(([a, b]) => !ignorados.includes(`${a.id}|${b.id}`));
  if (visiveis.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <Copy className="size-4" /> Possíveis cadastros repetidos ({visiveis.length})
      </h2>
      <p className="mt-1 text-xs text-amber-900">
        Nomes muito parecidos (ou mesmo WhatsApp). Se for a mesma pessoa, junte: o histórico fica num cadastro só.
      </p>
      <ul className="mt-3 space-y-2">
        {visiveis.map(([a, b]) => (
          <li key={`${a.id}|${b.id}`} className="bg-card space-y-2 rounded-lg border px-3 py-2.5 text-sm">
            <p>
              <b>{a.nome}</b> <span className="text-muted-foreground">e</span> <b>{b.nome}</b>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPar([a, b])}>
                Juntar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => ignorar(`${a.id}|${b.id}`)}>
                São pessoas diferentes
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {par && <JuntarDialog par={par} onFechar={() => setPar(null)} />}
    </section>
  );
}

function JuntarDialog({ par, onFechar }: { par: [ClienteResumo, ClienteResumo]; onFechar: () => void }) {
  // Sugestão: fica o cadastro com mais histórico
  const sugerido = par[0].visitas + par[0].total_gasto >= par[1].visitas + par[1].total_gasto ? 0 : 1;
  const [fica, setFica] = useState(sugerido);
  const [pendente, iniciar] = useTransition();
  const manter = par[fica];
  const sair = par[1 - fica];

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Juntar cadastros</DialogTitle>
          <DialogDescription>Escolha qual nome fica. Vendas, agendamentos e mensagens dos dois passam para ele.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {par.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFica(i)}
              className={cn(
                "w-full rounded-lg border p-3 text-left",
                fica === i ? "border-gold bg-accent ring-gold/40 ring-2" : "bg-card"
              )}
            >
              <span className="block font-semibold">{c.nome}</span>
              <span className="text-muted-foreground block text-xs">
                {c.visitas} {c.visitas === 1 ? "visita" : "visitas"} · {formatMoeda(c.total_gasto)}
                {c.ultima_visita ? ` · última ${dataBR(c.ultima_visita)}` : ""}
                {c.whatsapp ? " · tem WhatsApp" : ""}
              </span>
              <span className="mt-1 block text-xs font-medium">{fica === i ? "✓ Este nome fica" : "Este cadastro sai"}</span>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          “{sair.nome}” deixa de existir; o que faltar em “{manter.nome}” (WhatsApp, Instagram, nascimento) é
          completado com os dados dele.
        </p>
        <DialogFooter>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await juntarClientes(manter.id, sair.id);
                if (r.ok) {
                  toast.success(`Pronto: tudo ficou em ${manter.nome}`);
                  onFechar();
                } else toast.error(r.erro);
              })
            }
          >
            {pendente && <Loader2 className="animate-spin" />}
            Juntar em “{manter.nome}”
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
