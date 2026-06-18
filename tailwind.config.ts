import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy:   { 900: "#081726", 800: "#0B2545", 700: "#0F2D5C", 600: "#15396f" },
        recover:{ 400: "#34d77a", 500: "#22C55E", 600: "#16a34a" },
        amber:  { 500: "#F59E0B" },
        danger: { 500: "#DC2626" },
        ink:    { 100: "#eaf0f7", 300: "#aebccd", 500: "#6f8298" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
