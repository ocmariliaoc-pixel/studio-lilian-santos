"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

/*
 * Campos no padrão brasileiro, iguais em qualquer celular (o campo nativo segue o idioma do aparelho
 * e mostra mm/dd/aaaa e AM/PM num iPhone em inglês).
 *   CampoData: digita dd/mm/aaaa (as barras entram sozinhas) ou toca no calendário; envia aaaa-mm-dd.
 *   CampoHora: hora e minuto em 24h; envia hh:mm.
 */

export function isoParaBR(iso: string | null | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** dd/mm/aaaa (ou dd/mm/aa) → aaaa-mm-dd; null se incompleta ou se o dia não existe. */
export function brParaISO(texto: string) {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  if (dt.getUTCFullYear() !== ano || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== dia) return null;
  return dt.toISOString().slice(0, 10);
}

function mascaraData(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

type CampoDataProps = {
  id?: string;
  name?: string;
  /** controlado (aaaa-mm-dd) */
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  /** ao sair do campo ou escolher no calendário (para salvar na hora) */
  onCommit?: (iso: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
};

export function CampoData({
  id,
  name,
  value,
  defaultValue,
  onChange,
  onCommit,
  required,
  min,
  max,
  className,
  disabled,
}: CampoDataProps) {
  const inicial = value ?? defaultValue ?? "";
  const [iso, setIso] = useState(inicial);
  const [texto, setTexto] = useState(isoParaBR(inicial));
  const ref = useRef<HTMLInputElement>(null);

  // Valor controlado mudou por fora (ex.: trocar de dia na agenda)
  useEffect(() => {
    if (value !== undefined && value !== iso) {
      setIso(value);
      setTexto(isoParaBR(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Mensagens de validação em português
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let msg = "";
    if (texto && !iso) msg = texto.length < 8 ? "Complete a data: dd/mm/aaaa" : "Essa data não existe.";
    else if (iso && min && iso < min) msg = `A data precisa ser a partir de ${isoParaBR(min)}.`;
    else if (iso && max && iso > max) msg = `A data precisa ser até ${isoParaBR(max)}.`;
    el.setCustomValidity(msg);
  }, [texto, iso, min, max]);

  function aplicar(novo: string) {
    setIso(novo);
    onChange?.(novo);
  }

  function digitar(t: string) {
    const m = mascaraData(t);
    setTexto(m);
    aplicar(brParaISO(m) ?? "");
  }

  function sair() {
    // 11/09/26 → 11/09/2026
    const novo = brParaISO(texto);
    if (novo) setTexto(isoParaBR(novo));
    // data incompleta não é salva (nem apaga a que já estava)
    if (!texto) onCommit?.("");
    else if (novo) onCommit?.(novo);
  }

  const invalida = (!!texto && !iso) || (!!iso && ((!!min && iso < min) || (!!max && iso > max)));

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        onChange={(e) => digitar(e.target.value)}
        onBlur={sair}
        required={required}
        disabled={disabled}
        aria-invalid={invalida && texto.length >= 8 ? true : undefined}
        className={cn("pr-11 tabular-nums", className)}
      />
      {name && <input type="hidden" name={name} value={iso} />}
      <span className="text-muted-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center">
        <CalendarDays className="size-4" />
        {/* calendário do sistema por cima do ícone (só para escolher; o texto continua dd/mm/aaaa) */}
        <input
          type="date"
          tabIndex={-1}
          aria-label="Abrir calendário"
          value={iso}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            aplicar(e.target.value);
            setTexto(isoParaBR(e.target.value));
            onCommit?.(e.target.value);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
    </div>
  );
}

type CampoHoraProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (hhmm: string) => void;
  /** intervalo dos minutos (padrão 5) */
  passo?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  /** sem a setinha, para colunas estreitas */
  compacto?: boolean;
};

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

export function CampoHora({ id, name, value, onChange, passo = 5, required, disabled, className, compacto, ...rest }: CampoHoraProps) {
  const classeSelect = compacto ? "px-0 text-center [text-align-last:center] tabular-nums" : "pr-7 pl-2.5 tabular-nums";
  const [h, m] = (value || "").slice(0, 5).split(":");
  const minutos = Array.from({ length: Math.ceil(60 / passo) }, (_, i) => String(i * passo).padStart(2, "0"));
  if (m && !minutos.includes(m)) minutos.push(m);
  minutos.sort();

  return (
    <div className={cn("flex items-center gap-1", compacto && "[&_svg]:hidden", className)} role="group" aria-label={rest["aria-label"] ?? "Horário"}>
      {name && <input type="hidden" name={name} value={h && m ? `${h}:${m}` : ""} />}
      <div className="min-w-0 flex-1">
        <NativeSelect
          id={id}
          aria-label="Hora"
          value={h ?? ""}
          required={required}
          disabled={disabled}
          className={classeSelect}
          onChange={(e) => onChange(`${e.target.value}:${m ?? "00"}`)}
        >
          {!h && <option value="">--</option>}
          {HORAS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </NativeSelect>
      </div>
      <span className="text-muted-foreground font-semibold">:</span>
      <div className="min-w-0 flex-1">
        <NativeSelect
          aria-label="Minutos"
          value={m ?? ""}
          required={required}
          disabled={disabled}
          className={classeSelect}
          onChange={(e) => onChange(`${h ?? "08"}:${e.target.value}`)}
        >
          {!m && <option value="">--</option>}
          {minutos.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
