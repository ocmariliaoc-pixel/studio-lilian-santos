"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** Ano gravado quando não se sabe o ano de nascimento (só dia e mês importam para o aniversário). */
export const ANO_DESCONHECIDO = 1900;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function partes(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { dia: "", mes: "", ano: "" };
  return { dia: String(Number(m[3])), mes: String(Number(m[2])), ano: Number(m[1]) === ANO_DESCONHECIDO ? "" : m[1] };
}

/**
 * Aniversário: dia e mês (obrigatórios para salvar) + ano opcional. Sem calendário — o calendário
 * do celular abria no ano atual e não deixava escolher uma data depois de hoje.
 * Envia aaaa-mm-dd em onCommit (ano 1900 = ano não informado) ou "" para apagar.
 */
export function CampoAniversario({ value, onCommit }: { value: string; onCommit: (iso: string) => void }) {
  const inicial = partes(value);
  const [dia, setDia] = useState(inicial.dia);
  const [mes, setMes] = useState(inicial.mes);
  const [ano, setAno] = useState(inicial.ano);

  function enviar(d: string, m: string, a: string) {
    if (!d && !m) return onCommit("");
    if (!d || !m) return; // espera completar dia e mês
    const anoN = /^\d{4}$/.test(a) ? Number(a) : ANO_DESCONHECIDO;
    const dt = new Date(Date.UTC(anoN, Number(m) - 1, Number(d)));
    if (dt.getUTCMonth() !== Number(m) - 1) {
      // 31/02, 31/04…: ajusta para o último dia do mês
      const ultimo = new Date(Date.UTC(anoN, Number(m), 0)).getUTCDate();
      setDia(String(ultimo));
      return enviar(String(ultimo), m, a);
    }
    onCommit(dt.toISOString().slice(0, 10));
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <NativeSelect
        aria-label="Dia do aniversário"
        value={dia}
        className="h-9 pl-3 text-sm"
        onChange={(e) => {
          setDia(e.target.value);
          enviar(e.target.value, mes, ano);
        }}
      >
        <option value="">Dia</option>
        {Array.from({ length: 31 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {String(i + 1).padStart(2, "0")}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Mês do aniversário"
        value={mes}
        className="h-9 pl-3 text-sm"
        onChange={(e) => {
          setMes(e.target.value);
          enviar(dia, e.target.value, ano);
        }}
      >
        <option value="">Mês</option>
        {MESES.map((nome, i) => (
          <option key={nome} value={String(i + 1)}>
            {nome}
          </option>
        ))}
      </NativeSelect>
      <Input
        aria-label="Ano de nascimento (opcional)"
        inputMode="numeric"
        maxLength={4}
        placeholder="Ano"
        value={ano}
        className="h-9 px-3 text-sm"
        onChange={(e) => setAno(e.target.value.replace(/\D/g, ""))}
        onBlur={() => {
          if (ano && !/^\d{4}$/.test(ano)) return setAno(inicial.ano);
          if (ano !== inicial.ano) enviar(dia, mes, ano);
        }}
      />
    </div>
  );
}
