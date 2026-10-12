import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          bg: "var(--ov-bg)",
          elevated: "var(--ov-elevated)",
          card: "var(--ov-card)",
          border: "var(--ov-border)",
        },
        cream: "var(--ov-text)",
        muted: "var(--ov-muted)",
        bronze: {
          DEFAULT: "var(--ov-accent)",
          hover: "var(--ov-accent-hover)",
          dim: "var(--ov-accent-dim)",
        },
        moss: "var(--ov-success)",
        amberish: "var(--ov-warning)",
        clay: "var(--ov-critical)",
      },
      borderRadius: { card: "12px" },
      fontFamily: {
        sans: ["var(--font-ui)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(0,0,0,0.35), 0 12px 32px -18px rgba(0,0,0,0.65)",
      },
    },
  },
  plugins: [],
};

export default config;
