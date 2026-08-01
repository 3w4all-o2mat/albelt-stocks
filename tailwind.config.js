/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cc: "#3B82F6",
        cs: "#F59E0B",
        cp: "#EF4444",
        si: "#16A34A",
        uncut: "#E5E7EB",
        source: "#1F2937",
      },
    },
  },
  plugins: [],
};
