/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f6',
          500: '#0e8ce8',
          600: '#026fc6',
          700: '#0358a0',
          800: '#074b84',
          900: '#0c3f6e',
          950: '#082849',
        },
        slate: {
          850: '#151e2e',
          925: '#0b1120',
        }
      },
    },
  },
  plugins: [],
};
