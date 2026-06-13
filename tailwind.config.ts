import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        comet: {
          black: "#07070A",
          panel: "#121219",
          card: "#181821",
          border: "#2A2A35",
          red: "#E5264E",
          fuchsia: "#E143A6",
          violet: "#7A4DFF"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(225,67,166,.18), 0 16px 50px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
