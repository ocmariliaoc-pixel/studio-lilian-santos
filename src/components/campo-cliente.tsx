"use client";

import { useMemo, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clientesParecidas, nomeCombina, normalizarNome } from "@/lib/nomes";
import { cn } from "@/lib/utils";

/**
 * Campo "Cliente" com lista própria (abre embaixo do campo também no iPhone, onde o datalist não abre).
 *  - busca sem acento e por nome parecido ("gabriela" acha "Gabrielle");
 *  - nome que não está na lista = nova cliente: pede WhatsApp e, se houver cadastro parecido,
 *    mostra "É ela?" e só cadastra outra com a caixinha "É outra pessoa" marcada.
 * Envia: cliente_nome, cliente_whatsapp (nova) e confirmar_nova=1.
 */
export function CampoCliente({
  clientes,
  defaultValue = "",
  required,
  parecidasServidor,
  placeholder = "Digite o nome da cliente",
  id = "cliente_nome",
  onChange,
}: {
  clientes: string[];
  defaultValue?: string;
  required?: boolean;
  /** cadastros parecidos que o servidor achou ao salvar */
  parecidasServidor?: string[];
  placeholder?: string;
  id?: string;
  onChange?: (nome: string) => void;
}) {
  const [nome, setNome] = useState(defaultValue);
  const [aberta, setAberta] = useState(false);
  const [outraPessoa, setOutraPessoa] = useState(false);

  const existente = useMemo(
    () => clientes.find((c) => normalizarNome(c) === normalizarNome(nome)),
    [clientes, nome]
  );
  const opcoes = useMemo(() => {
    if (!nome.trim()) return clientes.slice(0, 8);
    const achadas = clientes.filter((c) => nomeCombina(nome, c));
    const parecidas = clientesParecidas(nome, clientes.map((c) => ({ nome: c }))).map((x) => x.nome);
    return [...new Set([...achadas, ...parecidas])].slice(0, 8);
  }, [clientes, nome]);
  const parecidas = useMemo(() => {
    if (!nome.trim() || existente) return [];
    const locais = clientesParecidas(nome, clientes.map((c) => ({ nome: c }))).map((x) => x.nome);
    return [...new Set([...locais, ...(parecidasServidor ?? [])])];
  }, [nome, existente, clientes, parecidasServidor]);
  const nova = !!nome.trim() && !existente;

  function escolher(c: string) {
    setNome(c);
    setOutraPessoa(false);
    setAberta(false);
    onChange?.(c);
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        name="cliente_nome"
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          setAberta(true);
          setOutraPessoa(false);
          onChange?.(e.target.value);
        }}
        onFocus={() => setAberta(true)}
        // fecha um pouco depois: no celular o toque na opção chega depois do blur
        onBlur={() => setTimeout(() => setAberta(false), 200)}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        required={required}
        role="combobox"
        aria-expanded={aberta}
        aria-controls={`${id}-lista`}
      />

      {aberta && (opcoes.length > 0 || nova) && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="bg-card max-h-64 divide-y overflow-y-auto rounded-lg border shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {opcoes.map((c) => (
            <li key={c} role="option" aria-selected={c === existente}>
              <button
                type="button"
                onClick={() => escolher(c)}
                className="hover:bg-secondary flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm"
              >
                <span className="flex-1">{c}</span>
                {c === existente && <Check className="text-gold-dark size-4" />}
              </button>
            </li>
          ))}
          {nova && (
            <li>
              <button
                type="button"
                onClick={() => setAberta(false)}
                className="text-gold-dark hover:bg-secondary flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium"
              >
                <UserPlus className="size-4" /> Nova cliente: “{nome.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}

      {existente && !aberta && (
        <p className="text-xs text-emerald-800">✓ Cliente já cadastrada: vai para o histórico dela.</p>
      )}

      {nova && !aberta && (
        <div
          className={cn(
            "space-y-2 rounded-lg border p-3",
            parecidas.length && !outraPessoa ? "border-amber-300 bg-amber-50" : "bg-secondary/40"
          )}
        >
          {parecidas.length > 0 ? (
            <>
              <p className="text-sm font-medium text-amber-950">Já existe cadastro parecido. É ela?</p>
              <div className="flex flex-wrap gap-2">
                {parecidas.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => escolher(c)}
                    className="bg-card min-h-10 rounded-full border border-amber-300 px-3 text-sm font-medium"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={outraPessoa}
                  onChange={(e) => setOutraPessoa(e.target.checked)}
                  className="accent-primary size-5"
                />
                É outra pessoa: cadastrar “{nome.trim()}”
              </label>
            </>
          ) : (
            <p className="text-sm">
              <UserPlus className="text-gold-dark mr-1 inline size-4" />
              Nova cliente: é cadastrada ao salvar.
            </p>
          )}
          {(parecidas.length === 0 || outraPessoa) && (
            <Input
              name="cliente_whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="WhatsApp com DDD (opcional)"
              autoComplete="off"
            />
          )}
          {outraPessoa && <input type="hidden" name="confirmar_nova" value="1" />}
        </div>
      )}
    </div>
  );
}
