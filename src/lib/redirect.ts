/** Aceita só caminhos internos (evita redirecionamento aberto). */
export function caminhoSeguro(next: string | null | undefined, padrao = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : padrao;
}
