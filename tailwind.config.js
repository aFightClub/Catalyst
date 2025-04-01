module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          50: "#f0f0f0",
          100: "#e0e0e0",
          200: "#c2c2c2",
          300: "#a3a3a3",
          400: "#858585",
          500: "#666666",
          600: "#4d4d4d",
          700: "#1f1f1f",
          750: "#191919",
          800: "#121212",
          900: "#0a0a0a",
          950: "#050505",
        },
        blue: {
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        green: {
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        red: {
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      borderRadius: {
        xl: "1rem",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
