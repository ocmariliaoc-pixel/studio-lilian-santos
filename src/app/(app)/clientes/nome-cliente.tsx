"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renomearCliente } from "./actions";

/** Nome da cliente com lápis para corrigir (vale também nas vendas e na agenda). */
export function NomeCliente({ id, nome }: { id: string; nome: string }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nome);
  const [atual, setAtual] = useState(nome);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    if (texto.trim() === atual) return setEditando(false);
    iniciar(async () => {
      const r = await renomearCliente(id, texto);
      if (r.ok) {
        setAtual(r.nome ?? texto.trim());
        setEditando(false);
        toast.success("Nome corrigido");
      } else toast.error(r.erro);
    });
  }

  if (!editando)
    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-medium">{atual}</span>
        <button
          type="button"
          onClick={() => {
            setTexto(atual);
            setEditando(true);
          }}
          className="text-muted-foreground hover:text-foreground -my-2 flex size-9 items-center justify-center rounded-md"
          aria-label={`Corrigir o nome de ${atual}`}
        >
          <Pencil className="size-3.5" />
        </button>
      </span>
    );

  return (
    <span className="flex w-full items-center gap-1.5">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditando(false);
        }}
        autoFocus
        autoCapitalize="words"
        aria-label="Nome da cliente"
        className="h-10"
        disabled={pendente}
      />
      <Button size="icon" className="size-10 shrink-0" onClick={salvar} disabled={pendente} aria-label="Salvar nome">
        {pendente ? <Loader2 className="animate-spin" /> : <Check />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-10 shrink-0"
        onClick={() => setEditando(false)}
        disabled={pendente}
        aria-label="Cancelar"
      >
        <X />
      </Button>
    </span>
  );
}
