/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 900: '#05070C', 800: '#0A0E16', 700: '#111726', 600: '#1A2233', 500: '#26314A' },
        pitch: { 500: '#2BD97C', 600: '#1FB868', 400: '#5FE79E' },
        clay: { 500: '#F2664B', 600: '#D9502F', 400: '#FF8A6D' },
        floodlight: { 500: '#FFD166', 400: '#FFE29A' },
        mist: { 100: '#F5F7FA', 300: '#C7CEDB', 500: '#8B93A7', 700: '#4A5468' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(43, 217, 124, 0.45)',
        glowClay: '0 0 40px -10px rgba(242, 102, 75, 0.45)',
      },
      backgroundImage: {
        floodgrid:
          'radial-gradient(circle at 20% 0%, rgba(43,217,124,0.15), transparent 40%), radial-gradient(circle at 85% 15%, rgba(255,209,102,0.10), transparent 35%), radial-gradient(circle at 50% 100%, rgba(242,102,75,0.08), transparent 40%)',
      },
    },
  },
  plugins: [],
};
