import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "slide-in-from-bottom": {
          from: {
            transform: "translateY(100%)",
            opacity: "0",
          },
          to: {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "slide-out-to-bottom": {
          from: {
            transform: "translateY(0)",
            opacity: "1",
          },
          to: {
            transform: "translateY(100%)",
            opacity: "0",
          },
        },
        "swipe-left": {
          from: {
            transform: "translateX(0) rotate(0deg)",
            opacity: "1",
          },
          to: {
            transform: "translateX(-100%) rotate(-30deg)",
            opacity: "0",
          },
        },
        "swipe-right": {
          from: {
            transform: "translateX(0) rotate(0deg)",
            opacity: "1",
          },
          to: {
            transform: "translateX(100%) rotate(30deg)",
            opacity: "0",
          },
        },
        "swipe-up": {
          from: {
            transform: "translateY(0) rotate(0deg)",
            opacity: "1",
          },
          to: {
            transform: "translateY(-100%) rotate(0deg)",
            opacity: "0",
          },
        },
        "brain-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "1",
          },
          "50%": {
            transform: "scale(1.1)",
            opacity: "0.8",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in-from-bottom 0.3s ease-out",
        "slide-out": "slide-out-to-bottom 0.3s ease-out",
        "swipe-left": "swipe-left 0.3s ease-out forwards",
        "swipe-right": "swipe-right 0.3s ease-out forwards",
        "swipe-up": "swipe-up 0.3s ease-out forwards",
        "brain-pulse": "brain-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "card": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "floating": "0 8px 32px rgba(0, 0, 0, 0.12)",
        "glow": "0 0 20px rgba(59, 130, 246, 0.15)",
      },
      aspectRatio: {
        "property": "4/5",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for PropertySwipe specific utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.swipe-card': {
          '@apply transform-gpu transition-transform duration-300 ease-out': {},
        },
        '.swipe-card-active': {
          '@apply cursor-grab active:cursor-grabbing': {},
        },
        '.property-gradient': {
          'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        '.glass': {
          '@apply backdrop-blur-md bg-white/75 border border-white/20': {},
        },
        '.glass-dark': {
          '@apply backdrop-blur-md bg-black/75 border border-white/10': {},
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
