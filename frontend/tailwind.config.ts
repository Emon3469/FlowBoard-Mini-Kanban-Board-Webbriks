import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background, #F7F8FA)",
        surface: "var(--surface, #FFFFFF)",
        "surface-variant": "var(--surface-variant, #F0F2F5)",
        primary: {
          DEFAULT: "#0066FF",
          container: "var(--primary-container, #E5F0FF)",
          "on-container": "var(--on-primary-container, #0052CC)",
        },
        "on-surface": "var(--on-surface, #1A1D21)",
        "on-surface-variant": "var(--on-surface-variant, #656F7D)",
        outline: "var(--outline, #E2E4E9)",
        "outline-variant": "var(--outline-variant, #F0F2F5)",
        success: "#00B36B",
        warning: "#FF8B00",
        danger: "#E5484D",
        info: "#0091FF",
        "status-discovery": "#0066FF",
        "status-demo": "#FF8B00",
        "status-won": "#00B36B",
        "status-leads": "#8792A2",
        "primary-container": "var(--primary-container, #E5F0FF)",
        "on-primary-container": "var(--on-primary-container, #0052CC)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        elevated: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        "drag": "0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
