import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // NO hardcoded credentials. All environment variables MUST be set via:
    // - .env file (local development)
    // - Hosting platform env vars (Vercel/Netlify/Railway dashboard)
    // If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing,
    // the app shows a configuration error screen (see supabaseConfig.ts).
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
