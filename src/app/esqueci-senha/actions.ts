"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EsqueciState = { enviado?: boolean; erro?: string };

export async function enviarLink(_: EsqueciState, formData: FormData): Promise<EsqueciState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erro: "Informe seu e-mail." };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });

  // Mesma resposta exista ou não a conta (não revela quais e-mails estão cadastrados).
  return { enviado: true };
}
