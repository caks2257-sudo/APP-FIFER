import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",

        "primary-accent": "var(--primary-accent)",
        "foreground-accent": "var(--foreground-accent)",
        "hero-background": "var(--hero-background)",

        // FIFER Dashboard DNA Tokens
        "fifer-deep-navy": "#0A0F1E",
        "fifer-accent": "#EAB308",
        "fifer-primary": "#1E293B",
        "fifer-surface": "#111827",
        "fifer-surface-elevated": "#1F2937",
        "fifer-border": "#374151",
        "fifer-border-subtle": "#1F2937",
      },
      fontFamily: {
        sans: ['var(--font-source-sans)', 'Source Sans 3', 'sans-serif'],
        heading: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem', // FIFER DNA: exactly 0.75rem
      },
    },
  },
  plugins: [],
};
export default config;
