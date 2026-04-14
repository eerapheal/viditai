/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // Matching web's primary blue
        background: "#0f172a",
        foreground: "#f8fafc",
        card: "#1e293b",
        muted: "#64748b",
      },
      fontFamily: {
        sans: ["sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
