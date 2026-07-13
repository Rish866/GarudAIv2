import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Fallback values for Supabase configuration when env vars are not set
      // in the hosting platform. These are publishable (anon) keys, safe for frontend.
      // Override by setting VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your
      // hosting environment (e.g., Vercel dashboard).
      ...(process.env.VITE_SUPABASE_URL ? {} : {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ybuhazlnjqjrshcvpuna.supabase.co'),
      }),
      ...(process.env.VITE_SUPABASE_ANON_KEY ? {} : {
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_JIoyS-ns6cXseQLRRm25cA_ZfWRFPg_'),
      }),
      ...(process.env.VITE_PLATFORM_ADMIN_EMAIL ? {} : {
        'import.meta.env.VITE_PLATFORM_ADMIN_EMAIL': JSON.stringify('rishkatiyar1@gmail.com'),
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
