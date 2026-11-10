"use client";

import { useEffect } from "react";

/**
 * Mensagens de validação dos formulários em português, mesmo em celular com idioma em inglês
 * ("Please fill out this field" → "Preencha este campo.").
 * Só mexe em campos sem mensagem própria; limpa ao digitar ou ao tentar enviar de novo.
 */
export function ValidacaoPtBR() {
  useEffect(() => {
    type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const marcados = new Set<Campo>();

    function mensagem(el: Campo) {
      const v = el.validity;
      if (v.valueMissing) {
        if (el instanceof HTMLSelectElement) return "Escolha uma opção.";
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return "Marque esta opção.";
        return "Preencha este campo.";
      }
      if (v.typeMismatch && el instanceof HTMLInputElement) {
        if (el.type === "email") return "Digite um e-mail válido, ex.: nome@gmail.com";
        if (el.type === "url") return "Digite um endereço válido.";
      }
      if (v.tooShort && "minLength" in el) return `Use pelo menos ${el.minLength} caracteres.`;
      if (v.tooLong && "maxLength" in el) return `Use no máximo ${el.maxLength} caracteres.`;
      if (el instanceof HTMLInputElement) {
        if (v.rangeUnderflow) return `O mínimo é ${el.min.replace(".", ",")}.`;
        if (v.rangeOverflow) return `O máximo é ${el.max.replace(".", ",")}.`;
        if (v.stepMismatch) return "Use um número inteiro.";
        if (v.badInput) return "Digite um número.";
        if (v.patternMismatch) return el.title || "Formato inválido.";
      }
      return "";
    }

    function aoInvalidar(e: Event) {
      const el = e.target as Campo;
      if (!el.validity || el.validity.customError) return;
      const msg = mensagem(el);
      if (!msg) return;
      el.setCustomValidity(msg);
      marcados.add(el);
    }
    function limpar(el: Campo) {
      if (marcados.delete(el)) el.setCustomValidity("");
    }
    function aoDigitar(e: Event) {
      limpar(e.target as Campo);
    }
    // Antes de validar de novo (o clique no botão vem antes da validação do envio)
    function aoClicar(e: Event) {
      const botao = (e.target as Element).closest?.("button, input[type=submit]") as HTMLButtonElement | null;
      if (!botao || botao.type !== "submit" || !botao.form) return;
      for (const el of [...marcados]) if (el.form === botao.form) limpar(el);
    }

    document.addEventListener("invalid", aoInvalidar, true);
    document.addEventListener("input", aoDigitar, true);
    document.addEventListener("change", aoDigitar, true);
    document.addEventListener("click", aoClicar, true);
    return () => {
      document.removeEventListener("invalid", aoInvalidar, true);
      document.removeEventListener("input", aoDigitar, true);
      document.removeEventListener("change", aoDigitar, true);
      document.removeEventListener("click", aoClicar, true);
    };
  }, []);
  return null;
}
