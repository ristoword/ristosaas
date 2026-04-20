import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RistoSaaS — Piattaforma all-in-one per ristoranti e hotel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f4f1fb",
          background:
            "radial-gradient(120% 80% at 50% -20%, rgba(224,56,199,0.45), transparent 55%)," +
            "radial-gradient(80% 60% at 90% 10%, rgba(122,44,242,0.45), transparent 60%)," +
            "radial-gradient(60% 60% at 10% 110%, rgba(255,77,157,0.35), transparent 55%)," +
            "linear-gradient(180deg, #0a0614 0%, #0a0614 100%)",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, #7a2cf2 0%, #e23cb6 50%, #ff4d9d 100%)",
              color: "white",
              fontSize: 28,
              fontWeight: 800,
              boxShadow: "0 20px 50px rgba(224,56,199,0.45)",
            }}
          >
            R
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            RistoSaaS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#ff6adf",
            }}
          >
            Una soluzione firmata gestionesemplificata.com
          </div>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: -2,
              maxWidth: 1000,
              backgroundImage:
                "linear-gradient(135deg, #ffffff 0%, #f4f1fb 60%, #cdbde6 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            La piattaforma all-in-one per ristoranti e hotel.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            fontSize: 22,
            color: "#cdbde6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                padding: "10px 22px",
                borderRadius: 9999,
                background:
                  "linear-gradient(135deg, #7a2cf2 0%, #e23cb6 50%, #ff4d9d 100%)",
                color: "white",
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              Login
            </span>
            <span
              style={{
                padding: "10px 22px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              Scopri la piattaforma
            </span>
          </div>
          <div style={{ opacity: 0.8, fontSize: 20 }}>gestionesemplificata.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
