import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para a server action SEM limpar os campos.
 * Com `<form action={...}>` o React 19 reseta o formulário depois de cada envio — num aviso ou erro
 * a tela voltava com campos vazios/errados (ex.: horário 18:00 virando 00:00 e o WhatsApp sumindo),
 * enquanto o estado interno continuava com os valores antigos.
 * Uso: <form onSubmit={semResetar(action)}>
 */
export function semResetar(action: (dados: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const dados = submitter ? new FormData(e.currentTarget, submitter) : new FormData(e.currentTarget);
    startTransition(() => action(dados));
  };
}
