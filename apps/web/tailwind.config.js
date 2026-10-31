/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#070809",
        "paper-2": "#0e1013",
        "paper-3": "#14171c",
        ink: "#f5f5f7",
        "ink-secondary": "#a1a1a6",
        muted: "#71717a",
      },
      fontFamily: {
        sans: ["'Google Sans'", "'Noto Sans Thai'", "Prompt", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
