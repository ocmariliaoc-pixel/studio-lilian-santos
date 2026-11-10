import { cn } from "@/lib/utils";

/**
 * Marca Lilian Santos Beauty Academy (recriada da logo: monograma LS dourado,
 * nome em capitulares e "BEAUTY • ACADEMY"). Trocar por /logo.svg quando houver o arquivo.
 */
export function Logo({
  className,
  compact = false,
  claro = false,
}: {
  className?: string;
  compact?: boolean;
  /** true sobre fundo escuro (menu lateral) */
  claro?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="font-brand flex size-10 shrink-0 items-center justify-center text-[28px] leading-none font-semibold tracking-[-0.12em] text-gold"
        aria-hidden
      >
        LS
      </span>
      {!compact && (
        <div className="leading-none">
          <p className={cn("font-brand text-[15px] font-semibold tracking-[0.14em]", claro ? "text-white" : "text-gold-dark")}>
            LILIAN SANTOS
          </p>
          <p className={cn("font-brand mt-1 text-[8.5px] tracking-[0.42em]", claro ? "text-gold" : "text-gold-dark/80")}>
            BEAUTY • ACADEMY
          </p>
        </div>
      )}
    </div>
  );
}
