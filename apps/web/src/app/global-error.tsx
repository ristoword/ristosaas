"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="it">
      <body style={{ background: "#050712", color: "#e2e5f0", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Errore critico</h2>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>{error.message || "Errore imprevisto."}</p>
          <button onClick={reset} style={{ background: "#6c63ff", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Riprova</button>
        </div>
      </body>
    </html>
  );
}
