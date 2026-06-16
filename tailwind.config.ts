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
        // matchmedia.com.bd brand palette
        charcoal: "#0F172A",
        trustGreen: "#047857",
        verifyGreen: "#10B981",
        gold: "#B45309",
        ivory: "#F7F4ED",
      },
      fontFamily: {
        // Latin / numerals
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Bengali
        bengali: ["var(--font-hind)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
