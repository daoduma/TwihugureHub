// tailwind.config.ts — CHANGED: Added TwihugureHub brand palette as theme tokens
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TwihugureHub brand palette
        primary: {
          DEFAULT: "#2D6A4F",
          50:  "#e8f5f0",
          100: "#c3e6d8",
          200: "#9bd5bf",
          300: "#6ec2a3",
          400: "#4db38e",
          500: "#2D6A4F",
          600: "#276045",
          700: "#1f5239",
          800: "#17442d",
          900: "#0e3221",
        },
        secondary: {
          DEFAULT: "#E9C46A",
          50:  "#fdf8ec",
          100: "#faedce",
          200: "#f6dfab",
          300: "#F2D181",
          400: "#E9C46A",
          500: "#d9aa44",
          600: "#b98d33",
          700: "#96701f",
          800: "#73530f",
          900: "#4e3802",
        },
        brand: {
          bg:   "#F8F9FA",
          text: "#1B1B1B",
          green: "#2D6A4F",
          gold:  "#E9C46A",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #2D6A4F 0%, #1f5239 100%)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(45,106,79,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
