import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/redirect";

/**
 * Retorno dos links enviados por e-mail (redefinir senha, convite, confirmação).
 * Aceita os dois formatos do Supabase: ?code=... (PKCE) e ?token_hash=...&type=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let next = caminhoSeguro(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
    if (type === "recovery" || type === "invite") next = "/redefinir-senha";
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/login?erro=link`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
