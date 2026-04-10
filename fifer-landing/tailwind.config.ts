import type { Config } from "tailwindcss";
import type { PluginCreator } from "tailwindcss/types/config";

/**
 * ADN FIFER — tokens nativos para v0:
 * `bg-fifer-navy`, `text-fifer-yellow`, `fifer-glass`, `shadow-fifer-glow-yellow`, `drop-shadow-fifer-glow-yellow`,
 * `font-fifer-heading`, `font-fifer-body` / `font-sans`.
 */
const fiferGlassPlugin: PluginCreator = ({ addUtilities }) => {
  addUtilities({
    /** Vidrio: blur 12px + fondo blanco 5% (clase única, sin combinar utilidades). */
    ".fifer-glass": {
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      backgroundColor: "rgb(255 255 255 / 0.05)",
    },
  });
};

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/registry/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/boxes/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "deep-navy": "var(--fifer-deep-navy)",
        "electric-yellow": "var(--fifer-electric-yellow)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        "primary-accent": "var(--primary-accent)",
        "foreground-accent": "var(--foreground-accent)",
        "hero-background": "var(--hero-background)",
        "fifer-dark": "#09090B",
        /** Chasis — sellado Master X-Ray */
        "fifer-navy": "#0A0F1E",
        "fifer-yellow": "#EAB308",
        /** Tinte 5% — combinable con `backdrop-blur-fifer-glass` o usar clase compuesta `fifer-glass` */
        "fifer-glass": "rgb(255 255 255 / 0.05)",
        "fifer-card": "#18181B",
        "fifer-electric": "#2563EB",
        "dashboard-bg": "var(--dashboard-bg)",
        "dashboard-sidebar": "var(--dashboard-sidebar)",
        "dashboard-canvas": "var(--dashboard-canvas)",
      },
      fontFamily: {
        /** Cuerpo — Open Sans (variable en layout) */
        sans: ["var(--font-open-sans)", "system-ui", "sans-serif"],
        "fifer-body": ["var(--font-open-sans)", "system-ui", "sans-serif"],
        /** Títulos — Montserrat */
        "fifer-heading": ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        /** Halo amarillo eléctrico — `shadow-fifer-glow-yellow` */
        "fifer-glow-yellow":
          "0 0 0 1px rgb(234 179 8 / 0.14), 0 0 24px rgb(234 179 8 / 0.32)",
        /** @deprecated usar `shadow-fifer-glow-yellow` */
        "glow-yellow":
          "0 0 0 1px rgb(234 179 8 / 0.14), 0 0 24px rgb(234 179 8 / 0.32)",
      },
      dropShadow: {
        /** Resplandor suave tipo drop — `drop-shadow-fifer-glow-yellow` */
        "fifer-glow-yellow": "0 0 10px rgb(234 179 8 / 0.38)",
      },
      backdropBlur: {
        /** Desenfoque vidrio — `backdrop-blur-fifer-glass` (12px) */
        "fifer-glass": "12px",
      },
      keyframes: {
        "fifer-artifact-spark": {
          "0%": { boxShadow: "0 0 0 0 rgba(234, 179, 8, 0.75)" },
          "45%": { boxShadow: "0 0 22px 8px rgba(234, 179, 8, 0.42)" },
          "100%": { boxShadow: "0 0 0 0 rgba(234, 179, 8, 0)" },
        },
      },
      animation: {
        "fifer-artifact-spark": "fifer-artifact-spark 0.65s ease-out",
      },
    },
  },
  plugins: [fiferGlassPlugin],
};
export default config;
