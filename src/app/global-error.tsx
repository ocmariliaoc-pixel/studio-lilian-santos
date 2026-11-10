"use client";

/** Último recurso (quando até o layout falha): página simples em português. */
export default function ErroGeral({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 24, textAlign: "center", background: "#f7f6f3", color: "#2b2926" }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Algo deu errado</h1>
          <p style={{ color: "#6b665e" }}>Confira a internet e tente de novo. Se continuar, avise a Marilia.</p>
          <button onClick={() => reset()} style={{ marginTop: 12, padding: "12px 20px", borderRadius: 8, border: 0, background: "#2b2926", color: "#fff", fontSize: 16 }}>
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
