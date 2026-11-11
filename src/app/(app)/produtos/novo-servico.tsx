"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServicoDialog } from "@/app/(app)/configuracoes/servicos/servico-form";

/** Qualquer usuária cadastra serviço novo (editar preço de um existente continua só com a admin). */
export function NovoServicoBotao({ categorias }: { categorias: string[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus /> Novo serviço
      </Button>
      <ServicoDialog open={aberto} onOpenChange={setAberto} servico={null} categorias={categorias} />
    </>
  );
}
