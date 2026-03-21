/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#184536",
        background: "#F8FAFC",
        foreground: "#1E293B",
        primary: {
          DEFAULT: "#184536",
          foreground: "#FFFFFF",
          50: "#f2fcf5",
          100: "#e1f8e8",
          200: "#c3ecd4",
          300: "#94dcb8",
          400: "#5dc296",
          500: "#36a57b",
          600: "#268461",
          700: "#206a4f",
          800: "#1d5440",
          900: "#184536",
          950: "#0d271f",
        },
        secondary: {
          DEFAULT: "#F5F5F0",
          foreground: "#184536",
          50: "#fbfbf9",
          100: "#f5f5f0",
          200: "#ebebe3",
          300: "#dad9cd",
          400: "#bfbead",
          500: "#a4a28d",
          600: "#84826f",
          700: "#6b6959",
          800: "#58574a",
          900: "#49483e",
          950: "#262620",
        },
        coral: {
          DEFAULT: "#E07A5F",
          50: "#fef4f1",
          100: "#ffe6df",
          200: "#ffd0c3",
          300: "#ffaf9b",
          400: "#fc8266",
          500: "#f25a38",
          600: "#e03e1f",
          700: "#bc2f15",
          800: "#9b2915",
          900: "#7e2616",
          950: "#441006",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#f2fcf5",
          foreground: "#184536",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1E293B",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};