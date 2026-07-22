import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Sitio estático: se puede publicar en Netlify, Vercel, GitHub Pages,
  // el Storage de Supabase o simplemente abrirse desde un servidor local.
  output: 'static',
  server: { port: 4321, host: true },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});
