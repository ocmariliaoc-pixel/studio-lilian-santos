"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarLink, type EsqueciState } from "./actions";

export function EsqueciForm() {
  const [state, action, pending] = useActionState<EsqueciState, FormData>(enviarLink, {});

  if (state.enviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="text-primary size-10" />
        <p className="text-sm">
          Se o e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.
          Abra o link <strong>neste mesmo aparelho e navegador</strong>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </div>
      {state.erro && (
        <p role="alert" className="text-destructive text-sm">
          {state.erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Enviar link
      </Button>
    </form>
  );
}
