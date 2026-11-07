import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmBreve({ fase, itens }: { fase: number; itens: string[] }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="bg-secondary text-primary flex size-12 items-center justify-center rounded-full">
          <Sparkles className="size-6" />
        </span>
        <p className="font-serif text-2xl font-semibold">Em construção</p>
        <p className="text-muted-foreground text-sm">Esta tela chega na fase {fase}:</p>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
