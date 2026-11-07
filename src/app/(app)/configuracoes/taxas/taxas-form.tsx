"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatMoeda } from "@/lib/format";
import {
  FORMAS_PAGAMENTO,
  numeroParaCampo,
  parseNumeroBR,
  valorLiquido,
  type FormaPagamento,
  type TaxaPagamento,
} from "@/lib/configuracoes";
import type { AcaoState } from "@/lib/acoes";
import { cn } from "@/lib/utils";
import { salvarTaxas } from "./actions";

type Linha = TaxaPagamento & { texto: string };

const SIMPLES: FormaPagamento[] = ["pix", "dinheiro", "debito", "credito_vista"];
const EXEMPLO = 100;

function chave(t: { forma: string; parcelas: number }) {
  return `${t.forma}-${t.parcelas}`;
}

function CampoPercentual({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="relative w-28 shrink-0">
      <Input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="pr-8 text-right"
        placeholder="0,00"
      />
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
        %
      </span>
    </div>
  );
}

export function TaxasForm({ taxas }: { taxas: TaxaPagamento[] }) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarTaxas, {});
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    taxas.map((t) => ({ ...t, texto: numeroParaCampo(t.taxa_percentual) }))
  );

  useEffect(() => {
    if (state.ok) toast.success("Taxas salvas");
    if (state.erro) toast.error(state.erro);
  }, [state.em, state.ok, state.erro]);

  const porChave = new Map(linhas.map((l) => [chave(l), l]));
  const parceladas = linhas
    .filter((l) => l.forma === "credito_parcelado")
    .sort((a, b) => a.parcelas - b.parcelas);
  const parceladoAtivo = parceladas.some((l) => l.ativo);

  function alterar(k: string, mudanca: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (chave(l) === k ? { ...l, ...mudanca } : l)));
  }

  function alternarParcelado(ativo: boolean) {
    setLinhas((atual) =>
      atual.map((l) => (l.forma === "credito_parcelado" ? { ...l, ativo } : l))
    );
  }

  const payload: TaxaPagamento[] = linhas.map(({ forma, parcelas, ativo, texto }) => ({
    forma,
    parcelas,
    ativo,
    taxa_percentual: parseNumeroBR(texto) ?? (texto.trim() === "" ? 0 : NaN),
  }));

  function liquido(texto: string) {
    const taxa = parseNumeroBR(texto);
    return taxa == null || taxa < 0 || taxa > 100 ? "—" : formatMoeda(valorLiquido(EXEMPLO, taxa));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="taxas" value={JSON.stringify(payload)} />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Formas de pagamento</CardTitle>
          <CardDescription>
            Ligue as formas que o studio aceita e informe a taxa cobrada pela maquininha. Ao lado,
            quanto sobra de um atendimento de {formatMoeda(EXEMPLO)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y px-0">
          {SIMPLES.map((forma) => {
            const l = porChave.get(`${forma}-1`);
            if (!l) return null;
            const k = chave(l);
            return (
              <div key={k} className="flex items-center gap-3 px-6 py-3.5">
                <Switch
                  checked={l.ativo}
                  onCheckedChange={(v) => alterar(k, { ativo: v })}
                  aria-label={`Aceitar ${FORMAS_PAGAMENTO[forma]}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-medium", !l.ativo && "text-muted-foreground")}>
                    {FORMAS_PAGAMENTO[forma]}
                  </span>
                  {l.ativo && (
                    <span className="text-muted-foreground block text-xs">
                      recebe {liquido(l.texto)}
                    </span>
                  )}
                </span>
                {l.ativo && (
                  <CampoPercentual
                    label={`Taxa ${FORMAS_PAGAMENTO[forma]}`}
                    value={l.texto}
                    onChange={(v) => alterar(k, { texto: v })}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <label className="flex items-center gap-3">
            <Switch
              checked={parceladoAtivo}
              onCheckedChange={alternarParcelado}
              aria-label="Aceitar crédito parcelado"
            />
            <CardTitle className="font-serif text-2xl">Crédito parcelado</CardTitle>
          </label>
          <CardDescription>
            Taxa total por número de parcelas. Desligue as parcelas que o studio não oferece.
          </CardDescription>
        </CardHeader>
        {parceladoAtivo && (
          <CardContent className="grid gap-x-8 px-0 sm:grid-cols-2 sm:px-6">
            {parceladas.map((l) => {
              const k = chave(l);
              return (
                <div key={k} className="flex items-center gap-3 border-b px-6 py-3 sm:px-0">
                  <Switch
                    checked={l.ativo}
                    onCheckedChange={(v) => alterar(k, { ativo: v })}
                    aria-label={`Aceitar ${l.parcelas}x`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-medium", !l.ativo && "text-muted-foreground")}>
                      {l.parcelas}x
                    </span>
                    {l.ativo && (
                      <span className="text-muted-foreground block text-xs">
                        recebe {liquido(l.texto)}
                      </span>
                    )}
                  </span>
                  <CampoPercentual
                    label={`Taxa ${l.parcelas}x`}
                    value={l.texto}
                    onChange={(v) => alterar(k, { texto: v })}
                    disabled={!l.ativo}
                  />
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <div className="bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-xl md:border">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar taxas
        </Button>
      </div>
    </form>
  );
}
