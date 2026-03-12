import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        indigo: { DEFAULT: "#818CF8", hover: "#6366F1", active: "#4F46E5" },
        amber: { DEFAULT: "#F59E0B", hover: "#D97706" },
        violet: { DEFAULT: "#A78BFA" },
        surface: { DEFAULT: "#0E0E12", "2": "#141418", offset: "#1A1A20", dynamic: "#222228" },
        divider: "#2A2A32",
        void: "#08080A",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "'Inter'", "sans-serif"],
        body: ["'Inter'", "'Helvetica Neue'", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [animate],
};
export default config;
