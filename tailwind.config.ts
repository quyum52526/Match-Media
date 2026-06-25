import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Brand Guidelines v1.0 (2026) — Garnet / Ivory premium identity ---
        // Mapped to the CSS variables in app/globals.css (single source of truth).
        primary: "var(--color-primary)", // Garnet
        "primary-dark": "var(--color-primary-dark)",
        secondary: "var(--color-secondary)", // Midnight Ink
        accent: "var(--color-accent)", // Champagne Gold
        canvas: "var(--color-bg)", // Ivory background
        surface: "var(--color-surface)", // White
        success: "var(--color-success)",
        ink: "var(--text-primary)", // primary text
        muted: "var(--text-secondary)", // secondary text
        hairline: "var(--color-hairline)", // borders / dividers
      },
      fontFamily: {
        // Headings: Fraunces (EN) → Noto Serif Bengali (BN fallback).
        display: ["var(--font-fraunces)", "var(--font-noto-bengali)", "Georgia", "serif"],
        // Body: Plus Jakarta Sans (EN) → Hind Siliguri (BN fallback).
        body: ["var(--font-jakarta)", "var(--font-hind)", "system-ui", "sans-serif"],
        // Keep `sans` as the default sans alias pointing at the brand body font
        // (a few non-Tailwind spots and the default may reference it).
        sans: ["var(--font-jakarta)", "var(--font-hind)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "var(--radius-pill)", // primary buttons
        card: "var(--radius-md)", // cards + inputs (14px)
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      keyframes: {
        // Soft, elegant location-pin pulse (Stripe-style — not flashy).
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.55" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        // Seamless marquee: the track holds two copies of the list, so shifting
        // by -50% loops with no visible seam.
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        // Line-art "drawing" — paths use pathLength=1, so dashoffset 1→0 traces
        // the contour regardless of true length.
        draw: {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.8s cubic-bezier(0, 0, 0.2, 1) infinite",
        marquee: "marquee 45s linear infinite",
        draw: "draw 2.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
