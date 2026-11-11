import type { Config } from "tailwindcss";

// Tokens mirror the Figma reference (Build ReproAI Fertility Platform/src/index.css).
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: "#0c655e", dark: "#094f49" },
        mint: "#dff2e9",
        coral: "#de7467",
        cream: "#f8f5ef",
        canvas: "#f5f8f6",
        ink: "#173330",
        muted: "#71817d",
        line: "#e3eae6"
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
        display: ["var(--font-manrope)", "Manrope", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
