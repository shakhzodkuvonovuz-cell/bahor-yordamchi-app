import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "user-message": {
          DEFAULT: "hsl(var(--user-message))",
          foreground: "hsl(var(--user-message-foreground))",
        },
        "ai-message": {
          DEFAULT: "hsl(var(--ai-message))",
          foreground: "hsl(var(--ai-message-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "display-2xl": ["4rem", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-xl": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["2.75rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "premium-sm": "var(--shadow-sm)",
        "premium-md": "var(--shadow-md)",
        "premium-lg": "var(--shadow-lg)",
        "glow": "var(--shadow-glow)",
        "glow-lg": "0 0 50px hsl(var(--primary) / 0.25)",
        "inner-glow": "inset 0 0 20px hsl(var(--primary) / 0.1)",
        "elevation-0": "var(--elevation-0)",
        "elevation-1": "var(--elevation-1)",
        "elevation-2": "var(--elevation-2)",
        "elevation-3": "var(--elevation-3)",
        "elevation-4": "var(--elevation-4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-8px) translateX(4px)" },
          "50%": { transform: "translateY(-4px) translateX(-4px)" },
          "75%": { transform: "translateY(-12px) translateX(2px)" },
        },
        // Thinking orb animations
        "thinking-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        "thinking-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "thinking-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.92)", opacity: "0.85" },
        },
        "thinking-orbit": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "thinking-orbit-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "thinking-rainbow": {
          "0%": { transform: "rotate(0deg) scale(1)", opacity: "0.7" },
          "50%": { transform: "rotate(180deg) scale(1.1)", opacity: "1" },
          "100%": { transform: "rotate(360deg) scale(1)", opacity: "0.7" },
        },
        // Logo animations
        "logo-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "logo-petal": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        "logo-core": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
        },
        "logo-breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        "logo-morph": {
          "0%, 100%": { d: "path('M50 15 C65 15 75 25 75 35 C85 40 90 55 85 70 C80 80 65 85 50 85 C35 85 20 80 15 70 C10 55 15 40 25 35 C25 25 35 15 50 15')" },
          "50%": { d: "path('M50 12 C68 12 78 22 78 35 C88 42 92 58 88 72 C82 82 68 88 50 88 C32 88 18 82 12 72 C8 58 12 42 22 35 C22 22 32 12 50 12')" },
        },
        "logo-inner-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(0.85)" },
        },
        "logo-line": {
          "0%": { strokeDasharray: "0 100", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { strokeDasharray: "100 0", opacity: "1" },
        },
        "logo-node": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "logo-ripple": {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "50%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.1)", opacity: "0.6" },
        },
        "logo-center-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "logo-3d-rotate": {
          "0%": { transform: "rotateY(0deg) rotateX(5deg)" },
          "50%": { transform: "rotateY(180deg) rotateX(-5deg)" },
          "100%": { transform: "rotateY(360deg) rotateX(5deg)" },
        },
        "logo-inner-glow": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.15)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        // Thinking orb animations
        "thinking-glow": "thinking-glow 2s ease-in-out infinite",
        "thinking-spin": "thinking-spin 3s linear infinite",
        "thinking-pulse": "thinking-pulse 1.5s ease-in-out infinite",
        "thinking-orbit": "thinking-orbit 2s linear infinite",
        "thinking-orbit-reverse": "thinking-orbit-reverse 2.5s linear infinite",
        "thinking-rainbow": "thinking-rainbow 3s linear infinite",
        // Logo animations
        "logo-rotate": "logo-rotate 8s linear infinite",
        "logo-petal": "logo-petal 2s ease-in-out infinite",
        "logo-core": "logo-core 1.5s ease-in-out infinite",
        "logo-breathe": "logo-breathe 3s ease-in-out infinite",
        "logo-inner-pulse": "logo-inner-pulse 2s ease-in-out infinite",
        "logo-line": "logo-line 1.5s ease-out forwards",
        "logo-node": "logo-node 0.8s ease-out forwards",
        "logo-ripple": "logo-ripple 2s ease-out infinite",
        "logo-center-spin": "logo-center-spin 4s linear infinite",
        "logo-3d-rotate": "logo-3d-rotate 6s ease-in-out infinite",
        "logo-inner-glow": "logo-inner-glow 2s ease-in-out infinite",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;