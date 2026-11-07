import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Papel = "admin" | "profissional";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
};

/** Perfil da usuária logada (cacheado por request). Redireciona para /login se não houver sessão. */
export const getPerfil = cache(async (): Promise<Perfil> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfis")
    .select("id, nome, papel")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    nome: data?.nome ?? user.email?.split("@")[0] ?? "Usuária",
    // Sem perfil cadastrado → menor privilégio.
    papel: (data?.papel as Papel) ?? "profissional",
  };
});

export function isAdmin(perfil: Perfil) {
  return perfil.papel === "admin";
}
