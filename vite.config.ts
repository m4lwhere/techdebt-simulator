import { defineConfig } from 'vite';

// Relative base so the built game runs from any static host (Pages, itch.io, etc.)
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'esnext', chunkSizeWarningLimit: 1500 },
});
