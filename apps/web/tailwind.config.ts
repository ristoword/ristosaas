import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rw: {
          bg: "#050712",
          surface: "#131627",
          surfaceAlt: "#181a2b",
          ink: "#f8f8fb",
          muted: "#7c8195",
          soft: "#a4a7bd",
          line: "#262a3e",
          sidebar: "#0e1117",
          sidebarMuted: "#9aa3b2",
          accent: "#e4572e",
          accentSoft: "#ff7a52",
          accentGlow: "rgba(228, 87, 46, 0.22)",
          success: "#1f9d73",
          warn: "#d9a441",
          focus: "#3b82f6",
        },
        landing: {
          bg: "#0a0614",
          surface: "#11091f",
          surfaceAlt: "#180a2a",
          line: "rgba(255, 255, 255, 0.08)",
          ink: "#f4f1fb",
          soft: "#cdbde6",
          muted: "#8478a3",
          violet: "#7a2cf2",
          violetSoft: "#a57bff",
          magenta: "#e23cb6",
          magentaSoft: "#ff6adf",
          pink: "#ff4d9d",
          glow: "rgba(224, 56, 199, 0.35)",
          glowSoft: "rgba(122, 44, 242, 0.22)",
        },
      },
      backgroundImage: {
        "landing-hero": "radial-gradient(120% 80% at 50% -20%, rgba(224, 56, 199, 0.35), transparent 55%), radial-gradient(80% 60% at 90% 10%, rgba(122, 44, 242, 0.35), transparent 60%), radial-gradient(60% 60% at 10% 110%, rgba(255, 77, 157, 0.25), transparent 55%)",
        "landing-grid": "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "landing-card": "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        rw: "0 18px 50px -24px rgba(0, 0, 0, 0.65)",
        "rw-sm": "0 8px 24px -16px rgba(0, 0, 0, 0.45)",
        "landing-card": "0 40px 120px -40px rgba(224, 56, 199, 0.35), 0 20px 60px -30px rgba(122, 44, 242, 0.35)",
        "landing-soft": "0 20px 60px -30px rgba(122, 44, 242, 0.35)",
        "landing-glow": "0 0 80px rgba(224, 56, 199, 0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.35rem",
      },
      transitionDuration: {
        rw: "220ms",
      },
      keyframes: {
        "landing-fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "landing-pulse-glow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.85" },
        },
        "landing-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "landing-fade-up": "landing-fade-up 680ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "landing-pulse-glow": "landing-pulse-glow 6s ease-in-out infinite",
        "landing-float": "landing-float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
