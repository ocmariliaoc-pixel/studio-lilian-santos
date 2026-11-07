import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SomenteLeitura() {
  return (
    <Badge variant="accent" className="h-7 px-2.5 text-xs">
      <Eye />
      Somente leitura
    </Badge>
  );
}
