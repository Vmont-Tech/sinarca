/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: "#050a05",
                foreground: "#FFFFFF",
                card: "#0a0f0a",

                // Landing Page specific colors (Matching CSS Variables)
                primary: "#00ff94",
                "primary-hover": "#00e083",
                "background-light": "#F8FAFC",
                "background-dark": "#050a05",
                "surface-dark": "#0a0f0a",
                "surface-light": "#FFFFFF",
                "accent-green": "#00ff94",

                "sinarca-forest": "#052216",
                "sinarca-deep": "#0a0f0a",
                "sinarca-neon": "#00ff94",
                "sinarca-border": "rgba(0, 255, 148, 0.2)",
                "text-main": "#FFFFFF",
                "text-muted": "#9cba9c",
            },
            fontFamily: {
                sans: ['Open Sans', 'sans-serif'],
                display: ['Montserrat', 'sans-serif'],
                serif: ['Montserrat', 'sans-serif'],
            },
            animation: {
                "fade-in-up": "fadeInUp 0.6s ease-out forwards",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite", // Updated duration
            },
            backgroundImage: {
                'hero-pattern': "url('https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=2574&auto=format&fit=crop')",
                'tech-grid': "url('https://grainy-gradients.vercel.app/noise.svg')",
            },
            keyframes: {
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(30px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
}
