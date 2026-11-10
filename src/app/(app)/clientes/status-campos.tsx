"use client";

import { useState, useTransition } from "react";
import { Cake, Check, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { CampoData } from "@/components/ui/campo-data";
import { NativeSelect } from "@/components/ui/native-select";
import {
  diasAteAniversario,
  linkWhatsApp,
  mensagemAniversario,
  MOTIVOS_PERDA,
  STATUS_CLIENTE,
  type ClienteResumo,
  type StatusCliente,
} from "@/lib/clientes";
import { salvarCampoCliente } from "./actions";

/** Status do funil, motivo da perda e data de nascimento — salvam ao mudar. */
export function StatusCampos({ c, hoje }: { c: ClienteResumo; hoje: string }) {
  const [status, setStatus] = useState<StatusCliente>(c.status);
  const [motivo, setMotivo] = useState(c.motivo_perda ?? "");
  const [nascimento, setNascimento] = useState(c.data_nascimento ?? "");
  const [salvando, iniciar] = useTransition();
  const [ok, setOk] = useState(false);

  function salvar(campo: "status" | "motivo_perda" | "data_nascimento", valor: string, desfazer: () => void) {
    iniciar(async () => {
      const r = await salvarCampoCliente(c.id, campo, valor);
      if (r.ok) {
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      } else {
        desfazer();
        toast.error(r.erro);
      }
    });
  }

  const dias = nascimento ? diasAteAniversario(nascimento, hoje) : null;
  const wa = linkWhatsApp(c.whatsapp, mensagemAniversario(c.nome));

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            Status
            {salvando ? <Loader2 className="size-3 animate-spin" /> : ok ? <Check className="size-3 text-emerald-600" /> : null}
          </span>
          <NativeSelect
            value={status}
            className="h-9 text-sm"
            onChange={(e) => {
              const antes = status;
              const novo = e.target.value as StatusCliente;
              setStatus(novo);
              if (novo !== "perdido") setMotivo("");
              salvar("status", novo, () => setStatus(antes));
            }}
          >
            {(Object.keys(STATUS_CLIENTE) as StatusCliente[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CLIENTE[s]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs font-medium">Nascimento</span>
          <CampoData
            value={nascimento}
            max={hoje}
            className="h-9 text-sm"
            onChange={setNascimento}
            onCommit={(iso) => {
              if ((iso || "") === (c.data_nascimento ?? "")) return;
              salvar("data_nascimento", iso, () => setNascimento(c.data_nascimento ?? ""));
            }}
          />
        </label>
      </div>

      {status === "perdido" && (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-xs font-medium">Por que perdemos?</span>
          <NativeSelect
            value={motivo}
            className="h-9 text-sm"
            onChange={(e) => {
              const antes = motivo;
              setMotivo(e.target.value);
              salvar("motivo_perda", e.target.value, () => setMotivo(antes));
            }}
          >
            <option value="">Escolha o motivo…</option>
            {MOTIVOS_PERDA.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}

      {dias !== null && dias <= 7 && (
        <div className="flex items-center gap-2 rounded-lg bg-pink-50 px-3 py-2 text-sm text-pink-900">
          <Cake className="size-4 shrink-0" />
          <span className="flex-1">
            {dias === 0 ? "Aniversário hoje!" : dias === 1 ? "Aniversário amanhã" : `Aniversário em ${dias} dias`}
          </span>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white"
            >
              <MessageCircle className="size-3.5" /> Parabéns
            </a>
          )}
        </div>
      )}
    </div>
  );
}
