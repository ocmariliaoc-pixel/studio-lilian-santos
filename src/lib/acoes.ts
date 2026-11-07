/** Resultado padrão das server actions de formulário. */
export type AcaoState = {
  ok?: boolean;
  erro?: string;
  /** Muda a cada envio, para o formulário reagir mesmo com mensagens iguais. */
  em?: number;
};

export function sucesso(): AcaoState {
  return { ok: true, em: Date.now() };
}

export function falha(erro: string): AcaoState {
  return { ok: false, erro, em: Date.now() };
}

/** Traduz erros do Postgres/Supabase para mensagens amigáveis. */
export function mensagemErroBanco(error: { code?: string; message?: string } | null) {
  if (!error) return "Erro desconhecido.";
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "42501") return "Você não tem permissão para fazer isso.";
  if (error.code === "23514") return "Algum valor está fora do permitido. Confira os campos.";
  return "Não foi possível salvar. Tente de novo.";
}
