import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6B7F4C', // Olive green from logo
                    dark: '#556339',
                    light: '#8A9D6F',
                },
                secondary: {
                    DEFAULT: '#8B7355', // Brown/tan from logo
                    dark: '#6F5C44',
                    light: '#A68968',
                },
                dark: {
                    DEFAULT: '#1A1A1A', // Deep charcoal
                    lighter: '#2A2A2A',
                    card: '#252525',
                },
                accent: {
                    cream: '#F5F1E8', // Cream from logo background
                    olive: '#6B7F4C',
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                display: ['var(--font-display)', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-dark': 'linear-gradient(to bottom, #1A1A1A, #2A2A2A)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out forwards',
                'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
        },
    },
    plugins: [],
};

export default config;
