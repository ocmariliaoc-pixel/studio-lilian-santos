"use client";

import { useState } from "react";
import { formatMoeda } from "@/lib/format";

/*
 * Faturamento acumulado no mês × ritmo da meta.
 * Forma: linha (mudança no tempo) + linha de referência tracejada (meta ideal).
 * Cor: slot 1 da paleta categórica de referência (#2a78d6) para o realizado; a meta é
 * referência, em cinza neutro tracejado. Um eixo só. Rótulos diretos + legenda + tooltip.
 */
const AZUL = "#2a78d6";
const CINZA = "#8f8a80";

export type PontoMeta = { dia: number; acumulado: number | null; meta: number };

export function MetaGrafico({ pontos, metaMes }: { pontos: PontoMeta[]; metaMes: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const m = { t: 16, r: 16, b: 28, l: 56 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(metaMes, ...pontos.map((p) => p.acumulado ?? 0)) * 1.05 || 1;
  const n = pontos.length;
  const x = (dia: number) => m.l + ((dia - 1) / Math.max(n - 1, 1)) * iw;
  const y = (v: number) => m.t + ih - (v / max) * ih;

  const reais = pontos.filter((p) => p.acumulado !== null) as { dia: number; acumulado: number; meta: number }[];
  const linhaReal = reais.map((p, i) => `${i ? "L" : "M"}${x(p.dia)},${y(p.acumulado)}`).join(" ");
  const area = reais.length
    ? `${linhaReal} L${x(reais[reais.length - 1].dia)},${y(0)} L${x(reais[0].dia)},${y(0)} Z`
    : "";
  const linhaMeta = pontos.map((p, i) => `${i ? "L" : "M"}${x(p.dia)},${y(p.meta)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((max / 1.05) * f));
  const ultimo = reais[reais.length - 1];
  const ph = hover !== null ? pontos[hover - 1] : null;

  return (
    <figure className="bg-card rounded-xl border p-4">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Faturamento acumulado no mês</span>
        <span className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: AZUL }} /> Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: CINZA }} /> Ritmo da meta
          </span>
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Faturamento acumulado no mês comparado ao ritmo da meta">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {t >= 1000 ? `${String(Math.round(t / 100) / 10).replace(".", ",")} mil` : t}
              </text>
            </g>
          ))}
          {[1, Math.ceil(n / 2), n].map((d) => (
            <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {d}
            </text>
          ))}
          <path d={linhaMeta} fill="none" stroke={CINZA} strokeWidth={2} strokeDasharray="5 5" />
          {area && <path d={area} fill={AZUL} opacity={0.1} />}
          {linhaReal && <path d={linhaReal} fill="none" stroke={AZUL} strokeWidth={2} strokeLinejoin="round" />}
          {ultimo && (
            <>
              <circle cx={x(ultimo.dia)} cy={y(ultimo.acumulado)} r={4.5} fill={AZUL} stroke="white" strokeWidth={2} />
              <text x={Math.min(x(ultimo.dia) + 8, W - m.r - 70)} y={y(ultimo.acumulado) - 8} className="fill-foreground text-[12px] font-semibold">
                {formatMoeda(ultimo.acumulado)}
              </text>
            </>
          )}
          <text x={W - m.r} y={y(metaMes) - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
            meta {formatMoeda(metaMes)}
          </text>
          {ph && (
            <line x1={x(ph.dia)} x2={x(ph.dia)} y1={m.t} y2={m.t + ih} stroke="currentColor" className="text-muted-foreground" strokeWidth={1} />
          )}
          {/* áreas de toque por dia (maiores que a marca) */}
          {pontos.map((p) => (
            <rect
              key={p.dia}
              x={x(p.dia) - iw / Math.max(n - 1, 1) / 2}
              y={m.t}
              width={iw / Math.max(n - 1, 1)}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(p.dia)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(p.dia)}
            />
          ))}
        </svg>
        {ph && (
          <div
            className="bg-popover pointer-events-none absolute top-2 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${Math.min(Math.max((x(ph.dia) / W) * 100, 10), 70)}%` }}
          >
            <p className="font-medium">Dia {ph.dia}</p>
            <p>Realizado: {ph.acumulado === null ? "—" : formatMoeda(ph.acumulado)}</p>
            <p className="text-muted-foreground">Meta até aqui: {formatMoeda(ph.meta)}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
