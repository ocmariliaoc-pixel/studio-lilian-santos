import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Marca Lilian Santos Beauty Academy (arquivos oficiais em /public):
 * - "completa": logo empilhada (monograma + nome) — login e menu lateral
 * - "horizontal": monograma + nome ao lado — cabeçalho do celular
 * `claro` = versão branca, para fundo escuro.
 */
export function Logo({
  className,
  variante = "horizontal",
  claro = false,
}: {
  className?: string;
  variante?: "completa" | "horizontal";
  claro?: boolean;
}) {
  if (variante === "completa") {
    return (
      <Image
        src={claro ? "/logo-branca.png" : "/logo-dourada.png"}
        alt="Lilian Santos Beauty Academy"
        width={720}
        height={386}
        priority
        className={cn("h-auto w-44", className)}
      />
    );
  }
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={claro ? "/monograma-branco.png" : "/monograma-dourado.png"}
        alt=""
        width={240}
        height={273}
        priority
        className="h-9 w-auto"
      />
      <div className="leading-none">
        <p className={cn("font-brand text-[15px] font-semibold tracking-[0.12em]", claro ? "text-white" : "text-gold-dark")}>
          LILIAN SANTOS
        </p>
        <p className={cn("font-brand mt-1 text-[8.5px] tracking-[0.4em]", claro ? "text-gold" : "text-gold-dark/80")}>
          BEAUTY • ACADEMY
        </p>
      </div>
    </div>
  );
}
