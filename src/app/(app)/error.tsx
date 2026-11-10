"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Erro dentro do sistema (com menu): explica em português e oferece tentar de novo. */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Algo deu errado nesta tela</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Pode ser a internet ou uma atualização do sistema. Tente de novo; se continuar, avise a Marilia.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Tentar de novo</Button>
        <Button asChild variant="outline">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
