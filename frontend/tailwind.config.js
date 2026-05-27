/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Era colors
        'era-debut': { primary: '#8B7355', secondary: '#C4A882', accent: '#4A7C59' },
        'era-fearless': { primary: '#D4AF37', secondary: '#FFD700', accent: '#FFF8DC' },
        'era-speaknow': { primary: '#7B2D8E', secondary: '#9B59B6', accent: '#D8B4FE' },
        'era-red': { primary: '#8B0000', secondary: '#DC143C', accent: '#FF6B6B' },
        'era-1989': { primary: '#5B9BD5', secondary: '#87CEEB', accent: '#E8D5F5' },
        'era-reputation': { primary: '#2D2D2D', secondary: '#4A4A4A', accent: '#C0C0C0' },
        'era-lover': { primary: '#FF69B4', secondary: '#FFB6C1', accent: '#87CEEB' },
        'era-folklore': { primary: '#708090', secondary: '#A9A9A9', accent: '#D3D3C7' },
        'era-evermore': { primary: '#8B6914', secondary: '#B8860B', accent: '#DAA520' },
        'era-midnights': { primary: '#191970', secondary: '#4169E1', accent: '#E6E6FA' },
        'era-ttpd': { primary: '#8B8378', secondary: '#C4B5A5', accent: '#DDD0C0' },
      },
      fontFamily: {
        'display': ['Georgia', 'serif'],
        'body': ['system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'drift': 'drift 20s linear infinite',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255,255,255,0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(255,255,255,0.3)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(10px) translateY(-10px)' },
          '50%': { transform: 'translateX(-5px) translateY(5px)' },
          '75%': { transform: 'translateX(15px) translateY(10px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
