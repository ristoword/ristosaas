import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
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
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        rw: "0 18px 50px -24px rgba(0, 0, 0, 0.65)",
        "rw-sm": "0 8px 24px -16px rgba(0, 0, 0, 0.45)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.35rem",
      },
      transitionDuration: {
        rw: "220ms",
      },
    },
  },
  plugins: [],
};

export default config;
