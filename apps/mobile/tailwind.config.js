module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#ff751f', foreground: '#ffffff', light: '#ff944d' },
        secondary: { DEFAULT: '#f5f5f7', foreground: '#1a1a2e' },
        muted: { DEFAULT: '#f5f5f7', foreground: '#6b7280' },
        destructive: '#ef4444',
        border: '#e5e7eb',
        input: '#e5e7eb',
        card: { DEFAULT: '#ffffff', foreground: '#2c2d2f' },
        background: '#ffffff',
        foreground: '#2c2d2f',
      },
      borderRadius: { DEFAULT: '0.625rem' },
    },
  },
  plugins: [],
};
