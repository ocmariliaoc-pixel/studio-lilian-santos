"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const NOVA = "__nova__";

/**
 * Categoria: lista com TODAS as categorias (o datalist do navegador só mostrava as que combinavam com
 * o que já estava escrito) + "+ Nova categoria…", que abre um campo para digitar. Envia `name`.
 */
export function CampoCategoria({
  id = "categoria",
  name = "categoria",
  categorias,
  defaultValue,
  placeholder = "Nome da nova categoria",
}: {
  id?: string;
  name?: string;
  categorias: string[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const lista = [...new Set(categorias.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const [valor, setValor] = useState(defaultValue ?? "");
  const [nova, setNova] = useState(false);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={valor} />
      <NativeSelect
        id={id}
        value={nova ? NOVA : valor}
        onChange={(e) => {
          if (e.target.value === NOVA) {
            setNova(true);
            setValor("");
          } else {
            setNova(false);
            setValor(e.target.value);
          }
        }}
      >
        <option value="">Escolha…</option>
        {lista.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        {valor && !nova && !lista.includes(valor) && <option value={valor}>{valor}</option>}
        <option value={NOVA}>+ Nova categoria…</option>
      </NativeSelect>
      {nova && (
        <Input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="sentences"
        />
      )}
    </div>
  );
}
