import { cn } from "@/lib/utils";

/** Monograma provisório até recebermos a logo oficial do studio. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full font-serif text-lg font-semibold">
        LS
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-serif text-xl font-semibold">Lilian Santos</p>
          <p className="text-muted-foreground text-[11px] tracking-[0.2em] uppercase">Studio</p>
        </div>
      )}
    </div>
  );
}
