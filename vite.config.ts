import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - rarely change, good cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', '@radix-ui/react-accordion'],
          // Supabase in its own chunk
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Increase chunk size warning limit (after splitting)
    chunkSizeWarningLimit: 600,
  },
}));
