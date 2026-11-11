"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CampoData, CampoHora } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { fecharHorario, reabrirHorario } from "./actions";
import { semResetar } from "@/lib/form";

export type Bloqueio = { id: string; inicio: string; fim: string; motivo: string };

const MOTIVOS = ["Folga", "Feriado", "Compromisso", "Curso", "Evento", "Outro"];

type Turno = "dia" | "manha" | "tarde" | "horario";

export function FecharHorarioBotao({
  data,
  abre,
  fecha,
}: {
  data: string;
  abre: string;
  fecha: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Lock /> Fechar horário
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar a agenda</DialogTitle>
            <DialogDescription>O horário fechado não aparece livre para agendar.</DialogDescription>
          </DialogHeader>
          <Formulario key={data} data={data} abre={abre} fecha={fecha} onFeito={() => setAberto(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Formulario({ data, abre, fecha, onFeito }: { data: string; abre: string; fecha: string; onFeito: () => void }) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(fecharHorario, {});
  const [turno, setTurno] = useState<Turno>("dia");
  const [de, setDe] = useState(abre);
  const [ate, setAte] = useState(fecha);

  useEffect(() => {
    if (state.ok) {
      toast.success("Horário fechado");
      onFeito();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  function escolher(t: Turno) {
    setTurno(t);
    const faixas: Record<Turno, [string, string] | null> = {
      dia: [abre, fecha],
      manha: [abre, "12:00"],
      tarde: ["12:00", fecha],
      horario: null,
    };
    const f = faixas[t];
    if (f) {
      setDe(f[0]);
      setAte(f[1]);
    }
  }

  return (
    <form onSubmit={semResetar(action)} className="space-y-4">
      <input type="hidden" name="de" value={de} />
      <input type="hidden" name="ate" value={ate} />
      <div className="space-y-2">
        <Label htmlFor="data-bloqueio">Dia</Label>
        <CampoData id="data-bloqueio" name="data" defaultValue={data} required />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["dia", "Dia inteiro"],
            ["manha", "Manhã"],
            ["tarde", "Tarde"],
            ["horario", "Escolher horário"],
          ] as const
        ).map(([t, rotulo]) => (
          <button
            key={t}
            type="button"
            onClick={() => escolher(t)}
            className={cn(
              "h-11 rounded-lg border px-2 text-sm font-medium",
              turno === t ? "border-primary bg-primary text-primary-foreground" : "bg-card"
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {turno === "horario" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>De</Label>
            <CampoHora aria-label="De" value={de} onChange={setDe} required />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <CampoHora aria-label="Até" value={ate} onChange={setAte} required />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Fecha das {de} às {ate}.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo</Label>
        <NativeSelect id="motivo" name="motivo" defaultValue="Folga">
          {MOTIVOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </div>
      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Fechar
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Faixa do horário fechado na grade do dia, com botão para reabrir. */
export function BloqueioBloco({ b, top, altura }: { b: Bloqueio; top: number; altura: number }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div
      className="absolute inset-x-1 z-10 flex items-start justify-between gap-2 overflow-hidden rounded-md border border-dashed border-stone-400 bg-stone-200/80 px-2 py-1 text-xs text-stone-700"
      style={{ top, height: Math.max(altura, 24) }}
    >
      <span className="flex items-center gap-1 font-medium">
        <Lock className="size-3" /> Fechado · {b.motivo}
      </span>
      <button
        type="button"
        disabled={pendente}
        className="flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 font-medium"
        onClick={() =>
          iniciar(async () => {
            const r = await reabrirHorario(b.id);
            if (r.ok) toast.success("Horário reaberto");
            else toast.error(r.erro);
          })
        }
      >
        <LockOpen className="size-3" /> Reabrir
      </button>
    </div>
  );
}
