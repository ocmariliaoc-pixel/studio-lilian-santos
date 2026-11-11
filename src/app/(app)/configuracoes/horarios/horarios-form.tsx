"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CampoHora } from "@/components/ui/campo-data";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  DIAS_SEMANA,
  ORDEM_DIAS,
  hhmm,
  type Configuracoes,
  type HorarioDia,
} from "@/lib/configuracoes";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { salvarHorarios } from "./actions";
import { semResetar } from "@/lib/form";

const INTERVALOS = [0, 5, 10, 15, 20, 30, 45, 60];

function normalizar(d: HorarioDia): HorarioDia {
  return {
    ...d,
    abre: hhmm(d.abre),
    fecha: hhmm(d.fecha),
    pausa_inicio: d.pausa_inicio ? hhmm(d.pausa_inicio) : null,
    pausa_fim: d.pausa_fim ? hhmm(d.pausa_fim) : null,
  };
}

export function HorariosForm({
  horarios,
  config,
}: {
  horarios: HorarioDia[];
  config: Configuracoes;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarHorarios, {});
  const [dias, setDias] = useState<HorarioDia[]>(() =>
    ORDEM_DIAS.map((n) => normalizar(horarios.find((h) => h.dia_semana === n)!))
  );

  useEffect(() => {
    if (state.ok) toast.success("Horários salvos");
    if (state.erro) toast.error(state.erro);
  }, [state.em, state.ok, state.erro]);

  function alterar(dia: number, mudanca: Partial<HorarioDia>) {
    setDias((atual) => atual.map((d) => (d.dia_semana === dia ? { ...d, ...mudanca } : d)));
  }

  function copiarParaTodos(origem: HorarioDia) {
    setDias((atual) =>
      atual.map((d) =>
        d.aberto && d.dia_semana !== origem.dia_semana
          ? {
              ...d,
              abre: origem.abre,
              fecha: origem.fecha,
              pausa_inicio: origem.pausa_inicio,
              pausa_fim: origem.pausa_fim,
            }
          : d
      )
    );
    toast("Horário copiado para os outros dias abertos. Lembre de salvar.");
  }

  const intervalos = INTERVALOS.includes(config.intervalo_min)
    ? INTERVALOS
    : [...INTERVALOS, config.intervalo_min].sort((a, b) => a - b);

  return (
    <form onSubmit={semResetar(action)} className="space-y-6">
      <input type="hidden" name="dias" value={JSON.stringify(dias)} />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Horário de atendimento</CardTitle>
          <CardDescription>
            A agenda só vai oferecer horários dentro destes períodos.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y px-0">
          {dias.map((d) => (
            <div key={d.dia_semana} className="space-y-3 px-6 py-4">
              <label className="flex items-center justify-between gap-3">
                <span className={cn("font-medium", !d.aberto && "text-muted-foreground")}>
                  {DIAS_SEMANA[d.dia_semana]}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    {d.aberto ? "Aberto" : "Fechado"}
                  </span>
                  <Switch
                    checked={d.aberto}
                    onCheckedChange={(v) => alterar(d.dia_semana, { aberto: v })}
                  />
                </span>
              </label>

              {d.aberto && (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 sm:gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Abre</Label>
                      <CampoHora compacto value={d.abre} onChange={(v) => alterar(d.dia_semana, { abre: v })} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Fecha</Label>
                      <CampoHora compacto value={d.fecha} onChange={(v) => alterar(d.dia_semana, { fecha: v })} required />
                    </div>
                  </div>

                  {d.pausa_inicio !== null ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-2 sm:gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">Pausa de</Label>
                        <CampoHora compacto value={d.pausa_inicio ?? ""} onChange={(v) => alterar(d.dia_semana, { pausa_inicio: v })} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">até</Label>
                        <CampoHora compacto value={d.pausa_fim ?? ""} onChange={(v) => alterar(d.dia_semana, { pausa_fim: v })} required />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover pausa"
                        onClick={() =>
                          alterar(d.dia_semana, { pausa_inicio: null, pausa_fim: null })
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-x-4">
                    {d.pausa_inicio === null && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-9 px-0"
                        onClick={() =>
                          alterar(d.dia_semana, { pausa_inicio: "12:00", pausa_fim: "13:00" })
                        }
                      >
                        <Plus />
                        Adicionar pausa (almoço)
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      className="text-muted-foreground h-9 px-0"
                      onClick={() => copiarParaTodos(d)}
                    >
                      <Copy />
                      Usar em todos os dias abertos
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Regras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="intervalo_min">Intervalo entre atendimentos</Label>
            <NativeSelect
              id="intervalo_min"
              name="intervalo_min"
              defaultValue={String(config.intervalo_min)}
            >
              {intervalos.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "Sem intervalo" : `${m} minutos`}
                </option>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs">
              Tempo para arrumar a sala entre uma cliente e outra.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dias_cliente_inativa">Cliente vira inativa após</Label>
            <div className="relative">
              <Input
                id="dias_cliente_inativa"
                name="dias_cliente_inativa"
                type="number"
                inputMode="numeric"
                min={7}
                max={730}
                defaultValue={config.dias_cliente_inativa}
                className="pr-28"
                required
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                dias sem visita
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-xl md:border">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar horários
        </Button>
      </div>
    </form>
  );
}
