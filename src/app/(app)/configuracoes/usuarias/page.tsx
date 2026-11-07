import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErroMigracao } from "@/components/erro-migracao";
import { UsuariasLista, type Usuaria } from "./usuarias-lista";

export const metadata: Metadata = { title: "Usuárias" };

export default async function UsuariasPage() {
  const perfil = await getPerfil();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, ativo")
    .order("ativo", { ascending: false })
    .order("nome");

  if (error) return <ErroMigracao />;

  return (
    <div className="space-y-6">
      <UsuariasLista usuarias={(data ?? []) as Usuaria[]} meuId={perfil.id} />

      <Card className="bg-secondary/40 gap-3 border-dashed">
        <CardHeader className="flex items-center gap-3">
          <UserPlus className="text-primary size-5" />
          <CardTitle>Adicionar uma nova usuária</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              No Supabase, abra <strong>Authentication → Users → Add user → Create new user</strong>.
            </li>
            <li>Informe o e-mail e uma senha provisória e marque &ldquo;Auto Confirm User&rdquo;.</li>
            <li>
              Volte aqui: ela aparece na lista como <strong>Profissional</strong>. Toque nela para
              ajustar o nome e o perfil.
            </li>
            <li>Ela pode trocar a senha em &ldquo;Esqueci minha senha&rdquo;, na tela de login.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
