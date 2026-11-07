"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Links de e-mail enviados pelo painel do Supabase chegam com a sessão no "#"
 * da URL (#access_token=...&type=recovery). O servidor não vê essa parte,
 * então a sessão é aplicada aqui no navegador.
 */
export function RecoveryHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const type = hash.get("type");
    history.replaceState(null, "", window.location.pathname + window.location.search);

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace("/login?erro=link");
          return;
        }
        router.replace(type === "recovery" || type === "invite" ? "/redefinir-senha" : "/");
        router.refresh();
      });
  }, [router]);

  return null;
}
