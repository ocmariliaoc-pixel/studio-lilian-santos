"use client";

import Link from "next/link";
import { ESCALAS, type Escala } from "@/lib/metas";
import { cn } from "@/lib/utils";


/** Quais dias contam como "dia de atendimento" na meta (a escolha fica salva neste aparelho). */
export function DiasBotoes({ escala, mes }: { escala: Escala; mes: string }) {
  return (
    <div className="mb-4">
      <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-widest uppercase">Dias de atendimento</p>
      <div className="bg-secondary/60 grid grid-cols-2 gap-1 rounded-xl p-1 sm:inline-grid sm:w-96">
        {(Object.keys(ESCALAS) as Escala[]).map((e) => (
          <Link
            key={e}
            href={`/metas?m=${mes.slice(0, 7)}&dias=${e}`}
            onClick={() => {
              document.cookie = `metas_dias=${e}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium",
              escala === e ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            {ESCALAS[e].rotulo}
          </Link>
        ))}
      </div>
    </div>
  );
}
