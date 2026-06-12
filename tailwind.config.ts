import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base
        background: "#0F1117",
        surface: "#161A22",
        panel: "#1B202B",

        // Brand
        accent: "#FF6C37",

        // Status
        success: "#4CAF50",
        warning: "#F5A623",
        danger: "#FF4D4F",

        // Text
        foreground: "#FFFFFF",
        muted: "#9CA3AF",

        // Borders
        border: "#2A3140",

        // Method colors (Postman style)
        get: "#61AFFE",
        post: "#49CC90",
        put: "#FCA130",
        patch: "#50E3C2",
        delete: "#F93E3E",

        // Additional UI shades
        sidebar: "#131720",
        sidebarHover: "#1F2532",
        input: "#202633",
        inputFocus: "#2A3140",

        // Response states
        responseSuccess: "#1E3A2F",
        responseWarning: "#3B2D12",
        responseError: "#3D1F22"
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "ui-monospace",
          "monospace"
        ]
      },

      boxShadow: {
        panel: "0 8px 24px rgba(0,0,0,0.35)",
        focus: "0 0 0 2px rgba(255,108,55,0.25)"
      },

      borderRadius: {
        panel: "8px"
      }
    }
  },
  plugins: []
} satisfies Config;