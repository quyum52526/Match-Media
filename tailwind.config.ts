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
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)", // Garnet
        "primary-dark": "rgb(var(--color-primary-dark-rgb) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)", // Midnight Ink
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)", // Champagne Gold
        canvas: "rgb(var(--color-bg-rgb) / <alpha-value>)", // Ivory background
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)", // White
        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        ink: "rgb(var(--text-primary-rgb) / <alpha-value>)", // primary text
        muted: "rgb(var(--text-secondary-rgb) / <alpha-value>)", // secondary text
        hairline: "rgb(var(--color-hairline-rgb) / <alpha-value>)", // borders / dividers
      },
      fontFamily: {
        // Headings: Fraunces (EN) → Noto Serif Bengali (BN fallback).
        display: ["var(--font-fraunces)", "var(--font-noto-bengali)", "Georgia", "serif"],
        // Body: Plus Jakarta Sans (EN) → Hind Siliguri (BN fallback).
        body: ["var(--font-jakarta)", "var(--font-hind)", "system-ui", "sans-serif"],
        bengali: ["var(--font-hind)", "system-ui", "sans-serif"],
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
