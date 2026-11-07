"use client";

import { useState, useTransition } from "react";
import { AtSign, Check, Loader2, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatTelefone, linkWhatsApp } from "@/lib/clientes";
import { cn } from "@/lib/utils";
import { salvarContato } from "./actions";

/** Campo que salva sozinho ao sair dele (ou ao apertar Enter). */
function CampoContato({
  clienteId,
  campo,
  inicial,
  exibir,
  placeholder,
  icone: Icone,
  inputMode,
  link,
  rotuloLink,
}: {
  clienteId: string;
  campo: "whatsapp" | "instagram";
  inicial: string | null;
  exibir: (v: string | null) => string;
  placeholder: string;
  icone: typeof Phone;
  inputMode: "tel" | "text";
  link: (v: string | null) => string | null;
  rotuloLink: string;
}) {
  const [salvo, setSalvo] = useState<string | null>(inicial);
  const [texto, setTexto] = useState(exibir(inicial));
  const [salvando, iniciar] = useTransition();
  const [ok, setOk] = useState(false);

  function salvar() {
    if (texto === exibir(salvo)) return;
    iniciar(async () => {
      const r = await salvarContato(clienteId, campo, texto);
      if (r.ok) {
        setSalvo(r.valor ?? null);
        setTexto(exibir(r.valor ?? null));
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      } else {
        toast.error(r.erro);
      }
    });
  }

  const href = link(salvo);

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        <Icone className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-label={placeholder}
          autoComplete="off"
          className="h-9 pr-7 pl-8 text-sm"
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2">
          {salvando ? (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          ) : ok ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : null}
        </span>
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={rotuloLink}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            campo === "whatsapp" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-secondary text-primary"
          )}
        >
          {campo === "whatsapp" ? <MessageCircle className="size-4" /> : <AtSign className="size-4" />}
        </a>
      )}
    </div>
  );
}

export function ContatoCampos({
  id,
  nome,
  whatsapp,
  instagram,
}: {
  id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
}) {
  const primeiroNome = nome.split(" ")[0];
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <CampoContato
        clienteId={id}
        campo="whatsapp"
        inicial={whatsapp}
        exibir={formatTelefone}
        placeholder="Telefone / WhatsApp"
        icone={Phone}
        inputMode="tel"
        link={(v) => linkWhatsApp(v, `Oi, ${primeiroNome}! Aqui é do Studio Lilian Santos 💛`)}
        rotuloLink={`Abrir WhatsApp de ${nome}`}
      />
      <CampoContato
        clienteId={id}
        campo="instagram"
        inicial={instagram}
        exibir={(v) => (v ? `@${v}` : "")}
        placeholder="Instagram"
        icone={AtSign}
        inputMode="text"
        link={(v) => (v ? `https://instagram.com/${v}` : null)}
        rotuloLink={`Abrir Instagram de ${nome}`}
      />
    </div>
  );
}
