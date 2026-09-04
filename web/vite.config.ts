import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    host: '127.0.0.1',
    watch: { usePolling: true },
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
      '/api': 'http://127.0.0.1:3000',
    },
  },
  plugins: [vinext()],
});
