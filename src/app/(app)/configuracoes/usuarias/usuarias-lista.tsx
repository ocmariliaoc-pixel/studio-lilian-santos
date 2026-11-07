"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { iniciais } from "@/components/user-menu";
import type { AcaoState } from "@/lib/acoes";
import type { Papel } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { salvarUsuaria } from "./actions";

export type Usuaria = {
  id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  ativo: boolean;
};

const PAPEIS: Record<Papel, { label: string; descricao: string }> = {
  admin: {
    label: "Administradora",
    descricao: "Acesso total: financeiro, metas, serviços, preços, configurações e usuárias.",
  },
  profissional: {
    label: "Profissional",
    descricao:
      "Agenda, clientes, anamnese e painel do dia. Financeiro e metas só leitura. Sem configurações.",
  },
};

export function UsuariasLista({ usuarias, meuId }: { usuarias: Usuaria[]; meuId: string }) {
  const [editando, setEditando] = useState<Usuaria | null>(null);

  return (
    <>
      <ul className="bg-card divide-y overflow-hidden rounded-xl border">
        {usuarias.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => setEditando(u)}
              className={cn(
                "hover:bg-secondary/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                !u.ativo && "opacity-60"
              )}
            >
              <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {iniciais(u.nome)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{u.nome}</span>
                  {u.id === meuId && <Badge variant="secondary">Você</Badge>}
                  {!u.ativo && <Badge variant="outline">Desativada</Badge>}
                </span>
                <span className="text-muted-foreground block truncate text-sm">
                  {PAPEIS[u.papel].label}
                  {u.email ? ` · ${u.email}` : ""}
                </span>
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuária</DialogTitle>
            <DialogDescription>{editando?.email}</DialogDescription>
          </DialogHeader>
          {editando && (
            <UsuariaForm
              key={editando.id}
              usuaria={editando}
              souEu={editando.id === meuId}
              onSalvo={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsuariaForm({
  usuaria,
  souEu,
  onSalvo,
}: {
  usuaria: Usuaria;
  souEu: boolean;
  onSalvo: () => void;
}) {
  const [state, action, pending] = useActionState<AcaoState, FormData>(salvarUsuaria, {});
  const [papel, setPapel] = useState<Papel>(usuaria.papel);
  const [ativo, setAtivo] = useState(usuaria.ativo);

  useEffect(() => {
    if (state.ok) {
      toast.success("Usuária atualizada");
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.em]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={usuaria.id} />

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={usuaria.nome} autoComplete="off" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="papel">Perfil de acesso</Label>
        {/* select desabilitado não é enviado: o valor vai no campo oculto */}
        <input type="hidden" name="papel" value={papel} />
        <NativeSelect
          id="papel"
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
          disabled={souEu}
        >
          <option value="admin">{PAPEIS.admin.label}</option>
          <option value="profissional">{PAPEIS.profissional.label}</option>
        </NativeSelect>
        <p className="text-muted-foreground text-xs">{PAPEIS[papel].descricao}</p>
      </div>

      <label className="bg-secondary/50 flex items-center justify-between gap-3 rounded-lg p-3">
        <span>
          <span className="block text-sm font-medium">Acesso ativo</span>
          <span className="text-muted-foreground block text-xs">
            Desativada, a conta não entra mais no sistema.
          </span>
        </span>
        <Switch checked={ativo} onCheckedChange={setAtivo} disabled={souEu} />
        {ativo && <input type="hidden" name="ativo" value="on" />}
      </label>

      {souEu && (
        <p className="text-muted-foreground text-xs">
          Para mudar o seu próprio perfil ou desativar sua conta, peça a outra administradora.
        </p>
      )}

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
