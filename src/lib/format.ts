export const LOCALE = "pt-BR";
export const TIMEZONE = "America/Fortaleza";

const moeda = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "BRL" });

/** R$ 1.234,56 */
export function formatMoeda(valor: number | null | undefined) {
  return moeda.format(valor ?? 0);
}

/** dd/mm/aaaa */
export function formatData(data: Date | string | number) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

/** HH:mm */
export function formatHora(data: Date | string | number) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

/** "sábado, 7 de novembro" */
export function formatDataExtenso(data: Date | string | number) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(data));
}

/** Saudação conforme a hora em Fortaleza. */
export function saudacao(agora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, hour: "numeric", hour12: false }).format(
      agora
    )
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
