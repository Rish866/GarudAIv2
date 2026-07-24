import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Supabase anon key is a PUBLISHABLE key (safe for frontend bundles).
      // It only allows access through RLS policies — no security risk.
      // Production deployments SHOULD override via hosting env vars.
      // These fallbacks ensure the app works without manual .env setup.
      ...(process.env.VITE_SUPABASE_URL ? {} : {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ybuhazlnjqjrshcvpuna.supabase.co'),
      }),
      ...(process.env.VITE_SUPABASE_ANON_KEY ? {} : {
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_JIoyS-ns6cXseQLRRm25cA_ZfWRFPg_'),
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Chunk splitting for better caching and faster initial load
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime (cached long-term, rarely changes)
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Supabase client (cached, only changes on SDK updates)
            'vendor-supabase': ['@supabase/supabase-js'],
            // UI libraries (cached, changes infrequently)
            'vendor-ui': ['framer-motion', 'lucide-react', 'zustand'],
            // Data/charting (only loaded when dashboard/reports render)
            'vendor-charts': ['recharts'],
            // Maps (only loaded when GPS/fleet map renders)
            'vendor-maps': ['leaflet', 'react-leaflet'],
            // Query/virtual (cached, utility layer)
            'vendor-data': ['@tanstack/react-query', '@tanstack/react-virtual', 'date-fns'],
          },
        },
      },
      // Increase chunk size warning limit (we're intentionally splitting)
      chunkSizeWarningLimit: 300,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
